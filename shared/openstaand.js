(function (global) {
  "use strict";

  function setStatus(el, type, msg) {
    el.className = "status" + (type ? " " + type : "");
    el.textContent = msg;
  }

  function createOpenstaandList({ syncClient, cardId, listId, statusId, refreshBtnId, openFolderBtnId, emptyText, shareText, pageSize }) {
    let files = [];
    let visibleCount = 0;
    const size = pageSize || 5;

    async function refresh() {
      const card = document.getElementById(cardId);
      const listEl = document.getElementById(listId);
      const statusEl = document.getElementById(statusId);
      setStatus(statusEl, "", "");

      if (!DropboxAuth.isConnected()) {
        card.style.display = "none";
        return;
      }
      card.style.display = "block";
      listEl.innerHTML = '<div class="empty-hint">Laden...</div>';

      try {
        files = await syncClient.listFiles();
        visibleCount = Math.min(size, files.length);
        renderItems();
      } catch (e) {
        console.error(e);
        setStatus(statusEl, "err", e.message || "Kon de lijst niet laden.");
        listEl.innerHTML = "";
      }
    }

    function renderItems() {
      const listEl = document.getElementById(listId);
      const statusEl = document.getElementById(statusId);

      if (!files.length) {
        listEl.innerHTML = '<div class="empty-hint">' + emptyText + "</div>";
        return;
      }

      listEl.innerHTML = "";
      const dummyPdf = new File([], "test.pdf", { type: "application/pdf" });
      const shareSupported = FileHelpers.canShareFiles(dummyPdf);

      files.slice(0, visibleCount).forEach((file) => {
        const row = document.createElement("div");
        row.className = "bon-item";
        const datum = new Date(file.client_modified).toLocaleDateString("nl-NL");
        row.innerHTML =
          '<div><div class="name">' + file.name + '</div><div class="meta">' + datum + "</div></div>" +
          '<div class="actions">' +
          (shareSupported ? '<button type="button" class="btn btn-outline share-btn">Delen</button>' : "") +
          '<button type="button" class="btn btn-outline download-btn">Downloaden</button>' +
          '<button type="button" class="btn btn-outline sent-btn">Verzonden</button>' +
          "</div>";

        function setBusy(busy) {
          row.querySelectorAll("button").forEach((b) => (b.disabled = busy));
        }
        function removeFromList() {
          const idx = files.indexOf(file);
          if (idx > -1) files.splice(idx, 1);
          if (visibleCount > files.length) visibleCount = files.length;
          renderItems();
        }

        const shareBtn = row.querySelector(".share-btn");
        if (shareBtn) {
          shareBtn.addEventListener("click", async () => {
            setBusy(true);
            try {
              const blob = await syncClient.downloadBytes(file.path_lower);
              await FileHelpers.shareOrDownload(file.name, blob, shareText);
            } catch (err) {
              console.error(err);
              setStatus(statusEl, "err", err.message || "Delen mislukt.");
            } finally {
              setBusy(false);
            }
          });
        }

        row.querySelector(".download-btn").addEventListener("click", async () => {
          setBusy(true);
          try {
            const blob = await syncClient.downloadBytes(file.path_lower);
            FileHelpers.downloadBlob(file.name, blob);
          } catch (err) {
            console.error(err);
            setStatus(statusEl, "err", err.message || "Downloaden mislukt.");
          } finally {
            setBusy(false);
          }
        });

        row.querySelector(".sent-btn").addEventListener("click", async () => {
          setBusy(true);
          try {
            await syncClient.moveToSent(file.path_lower, file.name);
            removeFromList();
          } catch (err) {
            console.error(err);
            setStatus(statusEl, "err", err.message || "Markeren als verzonden mislukt.");
            setBusy(false);
          }
        });

        listEl.appendChild(row);
      });

      if (visibleCount < files.length) {
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "btn btn-outline";
        moreBtn.style.width = "100%";
        moreBtn.style.marginTop = "10px";
        moreBtn.textContent = "Meer tonen (" + (files.length - visibleCount) + " resterend)";
        moreBtn.addEventListener("click", () => {
          visibleCount = Math.min(visibleCount + size, files.length);
          renderItems();
        });
        listEl.appendChild(moreBtn);
      }
    }

    const refreshBtn = document.getElementById(refreshBtnId);
    if (refreshBtn) refreshBtn.addEventListener("click", refresh);

    const openFolderBtn = document.getElementById(openFolderBtnId);
    if (openFolderBtn) {
      openFolderBtn.addEventListener("click", async () => {
        const statusEl = document.getElementById(statusId);
        const win = window.open("", "_blank");
        try {
          const url = await syncClient.getFolderLink();
          if (win) win.location.href = url;
          else location.href = url;
        } catch (e) {
          console.error(e);
          if (win) win.close();
          setStatus(statusEl, "err", e.message || "Kon de opslagmap niet openen.");
        }
      });
    }

    return { refresh };
  }

  global.createOpenstaandList = createOpenstaandList;
})(window);
