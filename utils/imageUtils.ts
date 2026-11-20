export const compressAvatarImage = (
  file: File,
  maxDimension = 256,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('INVALID_TYPE'));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('FILE_TOO_LARGE'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_ERROR'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('IMAGE_LOAD_ERROR'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const targetWidth = Math.max(1, Math.round(img.width * scale));
        const targetHeight = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('CANVAS_ERROR'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};
