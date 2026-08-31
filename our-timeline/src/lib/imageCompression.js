// Client-side image compression utility using HTML5 Canvas.
// Resizes large mobile/camera photos before upload to cap dimensions and file size,
// saving bandwidth and storage while preserving great visual quality.

export async function compressImage(
  file,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = {}
) {
  // If not a standard compressible image (or is SVG / animated GIF), return original
  if (
    !file ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Determine new dimensions if image exceeds max bounds
      let needResize = false;
      if (width > maxWidth || height > maxHeight) {
        needResize = true;
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // If file is already under 400KB and doesn't exceed dimensions, keep original
      if (!needResize && file.size < 400 * 1024) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compressed blob is somehow larger than original, return original
            resolve(file);
          } else {
            // Standardize output name with .jpg extension
            const originalName = file.name || "photo.jpg";
            const newName = originalName.replace(/\.[^.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Graceful fallback
    };

    img.src = objectUrl;
  });
}
