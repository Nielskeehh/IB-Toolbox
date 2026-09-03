(function (global) {
  "use strict";

  function sanitizeForFilename(str) {
    return (str || "onbekend")
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "onbekend";
  }

  function canShareFiles(file) {
    return !!(global.navigator.canShare && global.navigator.share && global.navigator.canShare({ files: [file] }));
  }

  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareOrDownload(filename, blob, shareText) {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: filename, text: shareText || "" });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
        // val terug op downloaden als delen om een andere reden mislukte
      }
    }
    downloadBlob(filename, blob);
    return "downloaded";
  }

  global.FileHelpers = { sanitizeForFilename, canShareFiles, shareOrDownload, downloadBlob };
})(window);
