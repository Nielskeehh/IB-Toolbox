(function (global) {
  "use strict";

  // Eén Dropbox-koppeling (App key + tokens) wordt gedeeld door alle tools op dit
  // domein, omdat ze allemaal dezelfde localStorage-sleutels gebruiken. Elke tool
  // praat alleen tegen createSyncClient({folder}) hieronder — zo kan een collega-
  // variant later een shared/onedrive.js met dezelfde functie-namen krijgen zonder
  // dat de tool-pagina's zelf hoeven te veranderen.
  const LS_APPKEY = "db_app_key";
  const LS_ACCESS_TOKEN = "db_access_token";
  const LS_REFRESH_TOKEN = "db_refresh_token";
  const LS_EXPIRES_AT = "db_expires_at";
  const SS_VERIFIER = "db_code_verifier";

  function redirectUri() {
    return location.origin + location.pathname;
  }

  function b64url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randomString(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return b64url(arr.buffer).slice(0, len);
  }
  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data);
  }

  async function startAuth(appKey) {
    if (!appKey) throw new Error("Vul eerst een Dropbox App key in.");
    localStorage.setItem(LS_APPKEY, appKey);

    const verifier = randomString(64);
    sessionStorage.setItem(SS_VERIFIER, verifier);
    const challenge = b64url(await sha256(verifier));

    const params = new URLSearchParams({
      client_id: appKey,
      response_type: "code",
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri(),
      token_access_type: "offline",
    });
    location.href = "https://www.dropbox.com/oauth2/authorize?" + params.toString();
  }

  async function finishAuthIfRedirected() {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    const verifier = sessionStorage.getItem(SS_VERIFIER);
    const appKey = localStorage.getItem(LS_APPKEY);
    history.replaceState({}, "", redirectUri());
    if (!verifier || !appKey) return;

    try {
      const resp = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: appKey,
          code_verifier: verifier,
          redirect_uri: redirectUri(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error_description || data.error || "Onbekende fout");
      localStorage.setItem(LS_ACCESS_TOKEN, data.access_token);
      if (data.refresh_token) localStorage.setItem(LS_REFRESH_TOKEN, data.refresh_token);
      localStorage.setItem(LS_EXPIRES_AT, String(Date.now() + (data.expires_in - 60) * 1000));
    } catch (e) {
      console.error("Dropbox auth failed", e);
    }
  }

  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
    const appKey = localStorage.getItem(LS_APPKEY);
    if (!refreshToken || !appKey) throw new Error("Niet verbonden met Dropbox");
    const resp = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error_description || data.error || "Vernieuwen mislukt");
    localStorage.setItem(LS_ACCESS_TOKEN, data.access_token);
    localStorage.setItem(LS_EXPIRES_AT, String(Date.now() + (data.expires_in - 60) * 1000));
    return data.access_token;
  }

  async function getValidAccessToken() {
    const expiresAt = Number(localStorage.getItem(LS_EXPIRES_AT) || 0);
    const token = localStorage.getItem(LS_ACCESS_TOKEN);
    if (token && Date.now() < expiresAt) return token;
    return refreshAccessToken();
  }

  function isConnected() {
    return !!localStorage.getItem(LS_REFRESH_TOKEN);
  }

  function disconnect() {
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_EXPIRES_AT);
  }

  function getAppKey() {
    return localStorage.getItem(LS_APPKEY) || "";
  }

  async function apiCall(endpoint, body) {
    const token = await getValidAccessToken();
    const resp = await fetch("https://api.dropboxapi.com/2/" + endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const rawText = await resp.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      // response was geen JSON; data blijft {} en de raw text wordt hieronder gebruikt
    }
    if (!resp.ok) {
      const detail = data.error_summary || (resp.status + " " + resp.statusText + (rawText ? ": " + rawText.slice(0, 300) : ""));
      const err = new Error(endpoint + " mislukt — " + detail);
      err.data = data;
      throw err;
    }
    return data;
  }

  function createSyncClient({ folder }) {
    const sentFolder = folder + "/Verzonden";
    const folderLinkKey = "db_folder_link:" + folder;

    async function upload(filename, bytes) {
      const token = await getValidAccessToken();
      const resp = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Dropbox-API-Arg": JSON.stringify({
            path: folder + "/" + filename,
            mode: "add",
            autorename: true,
            mute: false,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error("Upload naar Dropbox mislukt: " + errText);
      }
      return resp.json();
    }

    async function listFiles() {
      let entries = [];
      try {
        const data = await apiCall("files/list_folder", { path: folder });
        entries = data.entries || [];
      } catch (e) {
        if (e.data && e.data.error_summary && e.data.error_summary.startsWith("path/not_found")) return [];
        throw e;
      }
      return entries
        .filter((e) => e[".tag"] === "file")
        .sort((a, b) => new Date(b.client_modified) - new Date(a.client_modified));
    }

    async function moveToSent(path, filename) {
      await apiCall("files/move_v2", {
        from_path: path,
        to_path: sentFolder + "/" + filename,
        autorename: true,
      });
    }

    async function getFolderLink() {
      const cached = localStorage.getItem(folderLinkKey);
      if (cached) return cached;
      let url;
      try {
        const data = await apiCall("sharing/create_shared_link_with_settings", { path: folder });
        url = data.url;
      } catch (e) {
        const tag = e.data && e.data.error && e.data.error.shared_link_already_exists;
        if (tag) {
          const existing = await apiCall("sharing/list_shared_links", { path: folder, direct_only: true });
          if (existing.links && existing.links.length) url = existing.links[0].url;
        }
        if (!url) throw e;
      }
      localStorage.setItem(folderLinkKey, url);
      return url;
    }

    async function downloadBytes(path) {
      const token = await getValidAccessToken();
      const resp = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Dropbox-API-Arg": JSON.stringify({ path }),
        },
      });
      if (!resp.ok) throw new Error("Downloaden vanuit Dropbox mislukt.");
      return resp.blob();
    }

    return { upload, listFiles, moveToSent, getFolderLink, downloadBytes };
  }

  global.DropboxAuth = { getAppKey, startAuth, finishAuthIfRedirected, isConnected, disconnect };
  global.createDropboxSyncClient = createSyncClient;
})(window);
