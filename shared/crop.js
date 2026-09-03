(function (global) {
  "use strict";

  function createCropController({ overlayId, imageId, cancelBtnId, skipBtnId, applyBtnId, onClose }) {
    const overlay = document.getElementById(overlayId);
    const image = document.getElementById(imageId);
    let cropperInstance = null;
    let originalFile = null;
    let context = null;
    let onResult = null;

    function reset() {
      overlay.classList.remove("open");
      if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
      }
      const ctx = context;
      context = null;
      onResult = null;
      originalFile = null;
      if (onClose) onClose(ctx);
    }

    function open(file, ctx, resultCb) {
      originalFile = file;
      context = ctx;
      onResult = resultCb;
      image.src = URL.createObjectURL(file);
      overlay.classList.add("open");
      if (cropperInstance) cropperInstance.destroy();
      cropperInstance = new Cropper(image, {
        viewMode: 1,
        autoCropArea: 0.9,
        background: false,
        responsive: true,
      });
    }

    document.getElementById(cancelBtnId).addEventListener("click", reset);

    document.getElementById(skipBtnId).addEventListener("click", () => {
      const cb = onResult, ctx = context, file0 = originalFile;
      // Altijd opnieuw naar JPEG omzetten — voorkomt dat een formaat dat de browser wel
      // toont maar de PDF-bibliotheek niet herkent (bv. HEIC vanaf een iPhone) verderop
      // een onherkenbaar-bestandsformaat-fout geeft.
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], file0.name, { type: "image/jpeg" });
        reset();
        cb(file, ctx);
      }, "image/jpeg", 0.92);
    });

    document.getElementById(applyBtnId).addEventListener("click", () => {
      if (!cropperInstance) return;
      const cb = onResult, ctx = context, file0 = originalFile;
      const canvas = cropperInstance.getCroppedCanvas();
      canvas.toBlob((blob) => {
        const file = new File([blob], file0.name, { type: "image/jpeg" });
        reset();
        cb(file, ctx);
      }, "image/jpeg", 0.92);
    });

    return { open };
  }

  global.createCropController = createCropController;
})(window);
