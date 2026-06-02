/**
 * Validates and resizes an image file for API submission.
 * Ensures the image is a supported type and within size limits.
 */
export async function prepareImageForUpload(
  file: File,
  maxDimension: number = 2048
): Promise<{ base64: string; mimeType: string }> {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}. Use JPEG, PNG, or WebP.`);
  }

  const img = await createImageBitmap(file);
  
  let blob: Blob;
  if (img.width <= maxDimension && img.height <= maxDimension) {
    blob = file;
  } else {
    const scale = maxDimension / Math.max(img.width, img.height);
    const canvas = new OffscreenCanvas(
      Math.round(img.width * scale),
      Math.round(img.height * scale)
    );
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(blob);
  });
}
