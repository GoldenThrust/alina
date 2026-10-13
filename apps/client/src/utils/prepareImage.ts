const MAX_LONG_SIDE = 2560;
const MIN_SHORT_SIDE_HD = 1080;
const MAX_BYTES = 10 * 1024 * 1024; // API limit: < 10MB
const JPEG_QUALITIES = [0.92, 0.85, 0.75, 0.65];

export class ImageSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSizeError";
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

/**
 * Prepares an image for HD AI Skin Analysis:
 * - applies EXIF orientation
 * - rejects images whose short side is below 1080px
 * - downscales so the long side is at most 2560px
 * - re-encodes as JPEG under 10MB
 */
export async function prepareImageForSkinAnalysis(source: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(source, {
      imageOrientation: "from-image",
    });
  } catch {
    throw new ImageSizeError(
      "This image format isn't supported. Please use a JPG or PNG photo.",
    );
  }

  try {
    const { width, height } = bitmap;

    if (Math.min(width, height) < MIN_SHORT_SIDE_HD) {
      throw new ImageSizeError(
        `This photo is too small (${width}×${height}). HD analysis needs at least ${MIN_SHORT_SIDE_HD}px on the short side.`,
      );
    }

    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    // Only possible with very elongated images (aspect ratio above ~2.37).
    if (Math.min(targetW, targetH) < MIN_SHORT_SIDE_HD) {
      throw new ImageSizeError(
        "This photo is too wide or too tall. Please use a portrait photo of your face.",
      );
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the image.");

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size < MAX_BYTES) return blob;
    }

    throw new ImageSizeError(
      "This photo is too large to upload. Please use a smaller photo.",
    );
  } finally {
    bitmap.close();
  }
}