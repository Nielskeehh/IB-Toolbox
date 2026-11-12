(function (global) {
  "use strict";

  function setStatus(el, type, msg) {
    el.className = "status" + (type ? " " + type : "");
    el.textContent = msg;
  }

  // Lokale geschiedenis van gemaakte PDF's (IndexedDB, standaard 90 dagen). Elke tool geeft een
  // eigen dbName mee; store, sleutel en itemvorm ({ filename, pdf, aangemaakt }) staan vast,
  // zodat bestaande data van de losse Stortingen-app gewoon blijft werken.
  // shareMeta (optioneel): functie(bestandsnaam) -> { title, text }; anders gelden bestandsnaam / shareText.
  function createGeschiedenis({ dbName, listId, statusId, emptyText, shareText, shareMeta, pageSize, bewaarDagen }) {
    const size = pageSize || 5;
    const dagen = bewaarDagen || 90;
    let dbPromise = null;
    let items = [];
    let visibleCount = 0;

    function openDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains("pdfs")) {
            req.result.createObjectStore("pdfs", { keyPath: "id", autoIncrement: true });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbPromise;
    }

    async function dbAction(mode, fn) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("pdfs", mode);
        const req = fn(tx.objectStore("pdfs"));
        tx.oncomplete = () => resolve(req && "result" in req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }

    const alle = () => dbAction("readonly", (s) => s.getAll());

    async function ruimOp() {
      const grens = Date.now() - dagen * 24 * 60 * 60 * 1000;
      const oud = (await alle()).filter((x) => x.aangemaakt < grens);
      if (oud.length) await dbAction("readwrite", (s) => { oud.forEach((o) => s.delete(o.id)); });
    }

    async function render() {
      const listEl = document.getElementById(listId);
      try {
        items = (await alle()).sort((a, b) => b.aangemaakt - a.aangemaakt);
      } catch (e) {
        console.error(e);
        listEl.innerHTML = '<div class="empty-hint">Geschiedenis kon niet geladen worden.</div>';
        return;
      }
      visibleCount = Math.min(size, items.length);
      renderItems();
    }

    function renderItems() {
      const listEl = document.getElementById(listId);
      const statusEl = document.getElementById(statusId);

      if (!items.length) {
        listEl.innerHTML = '<div class="empty-hint">' + emptyText + "</div>";
        return;
      }

      listEl.innerHTML = "";
      const shareSupported = FileHelpers.canShareFiles(new File([], "test.pdf", { type: "application/pdf" }));

      items.slice(0, visibleCount).forEach((item) => {
        const row = document.createElement("div");
        row.className = "bon-item";

        // Bestandsnaam via textContent: de naam kan door gebruikers ingevulde tekst bevatten.
        const info = document.createElement("div");
        const nameEl = document.createElement("div");
        nameEl.className = "name";
        nameEl.textContent = item.filename;
        const metaEl = document.createElement("div");
        metaEl.className = "meta";
        const t = new Date(item.aangemaakt);
        metaEl.textContent = t.toLocaleDateString("nl-NL") + " " + t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
        info.append(nameEl, metaEl);

        const actions = document.createElement("div");
        actions.className = "actions";
        actions.innerHTML =
          (shareSupported ? '<button type="button" class="btn btn-outline share-btn">Delen</button>' : "") +
          '<button type="button" class="btn btn-outline download-btn">Downloaden</button>';
        row.append(info, actions);

        const shareBtn = row.querySelector(".share-btn");
        if (shareBtn) {
          shareBtn.addEventListener("click", async () => {
            try {
              const meta = shareMeta ? shareMeta(item.filename) : null;
              await FileHelpers.shareOrDownload(item.filename, item.pdf, meta ? meta.text : shareText, meta ? meta.title : undefined);
            } catch (err) {
              console.error(err);
              setStatus(statusEl, "err", err.message || "Delen mislukt.");
            }
          });
        }
        row.querySelector(".download-btn").addEventListener("click", () => {
          FileHelpers.downloadBlob(item.filename, item.pdf);
        });

        listEl.appendChild(row);
      });

      if (visibleCount < items.length) {
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "btn btn-outline";
        moreBtn.style.width = "100%";
        moreBtn.style.marginTop = "10px";
        moreBtn.textContent = "Meer tonen (" + (items.length - visibleCount) + " resterend)";
        moreBtn.addEventListener("click", () => {
          visibleCount = Math.min(visibleCount + size, items.length);
          renderItems();
        });
        listEl.appendChild(moreBtn);
      }
    }

    // Bewaart de PDF op dit toestel; gooit nooit een fout, zodat delen/uploaden gewoon doorgaat.
    async function bewaar(filename, pdf) {
      try {
        await dbAction("readwrite", (s) => s.add({ filename, pdf, aangemaakt: Date.now() }));
      } catch (e) {
        console.error("Bewaren in geschiedenis mislukt", e);
        return false;
      }
      render();
      return true;
    }

    async function init() {
      try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
      try { await ruimOp(); } catch (e) { console.error(e); }
      await render();
    }

    return { bewaar, render, init };
  }

  global.createGeschiedenis = createGeschiedenis;
})(window);
