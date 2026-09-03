(function (global) {
  "use strict";

  function initSettingsPanel({ onAfterClose }) {
    const overlay = document.getElementById("settingsOverlay");
    const appKeyInput = document.getElementById("appKeyInput");
    const statusEl = document.getElementById("settingsStatus");

    function setStatus(type, msg) {
      statusEl.className = "status" + (type ? " " + type : "");
      statusEl.textContent = msg;
    }

    function updateStatusUI() {
      const connected = DropboxAuth.isConnected();
      document.getElementById("dbDot").className = "dot " + (connected ? "on" : "off");
      document.getElementById("dbStatusText").textContent = connected ? "Verbonden met Dropbox" : "Niet verbonden met Dropbox";
      document.getElementById("connectBtn").style.display = connected ? "none" : "block";
      document.getElementById("disconnectBtn").style.display = connected ? "block" : "none";
    }

    document.getElementById("settingsBtn").addEventListener("click", () => {
      overlay.classList.add("open");
      appKeyInput.value = DropboxAuth.getAppKey();
    });
    document.getElementById("closeSettings").addEventListener("click", () => {
      overlay.classList.remove("open");
      if (onAfterClose) onAfterClose();
    });
    document.getElementById("connectBtn").addEventListener("click", async () => {
      try {
        await DropboxAuth.startAuth(appKeyInput.value.trim());
      } catch (e) {
        setStatus("err", e.message || "Kon niet verbinden.");
      }
    });
    document.getElementById("disconnectBtn").addEventListener("click", () => {
      DropboxAuth.disconnect();
      updateStatusUI();
      if (onAfterClose) onAfterClose();
    });

    updateStatusUI();
    return { updateStatusUI };
  }

  global.initSettingsPanel = initSettingsPanel;
})(window);
