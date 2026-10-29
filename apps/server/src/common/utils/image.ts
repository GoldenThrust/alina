import sharp, { type Metadata } from "sharp";
import { YouCamError } from "../../errors/YouCamError";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024 - 1; // YouCam File API: < 10MB
const JPEG_QUALITIES = [90, 80, 70, 60];

export type ImageLimits = {
  /** Longest side allowed, in px. Bigger images are scaled down to fit. */
  maxLongSide?: number;
  /**
   * Shortest side required, in px. Smaller images are rejected, because
   * upscaling adds no detail. Checked before any upload.
   */
  minShortSide?: number;
  /** Max file size in bytes. Default: just under 10 MB. */
  maxBytes?: number;
  /** "jpeg" converts PNG (or other) input to JPEG. Default: "keep". */
  format?: "keep" | "jpeg";
};

/**
 * Makes an image fit an API's limits.
 *
 * - Only ever scales DOWN, keeping the aspect ratio.
 * - Applies EXIF rotation first, so width/height match what the API sees.
 * - Strips metadata (EXIF, GPS) from any image it re-encodes.
 * - Returns the original bytes untouched when nothing needs to change.
 * - If the result is still too big, lowers JPEG quality (a PNG falls back to JPEG).
 */
export async function fitImage(
  input: Buffer,
  limits: ImageLimits = {},
): Promise<Buffer> {
  const {
    maxLongSide,
    minShortSide,
    maxBytes = DEFAULT_MAX_BYTES,
    format = "keep",
  } = limits;

  let meta: Metadata;
  try {
    meta = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    throw new YouCamError("Could not read the image.", "invalid_image");
  }

  // EXIF orientations 5-8 are rotated 90°, so the stored sides are swapped.
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;
  if (!width || !height) {
    throw new YouCamError("Could not read the image size.", "invalid_image");
  }

  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);

  if (minShortSide && shortSide < minShortSide) {
    throw new YouCamError(
      `Image is too small: the shortest side must be at least ${minShortSide}px (got ${shortSide}px).`,
      "error_below_min_image_size",
    );
  }

  const isJpeg = meta.format === "jpeg";
  const isPng = meta.format === "png";
  const needsResize = !!maxLongSide && longSide > maxLongSide;
  const needsConvert = format === "jpeg" && !isJpeg;
  const needsShrink = input.length > maxBytes;

  if (!needsResize && !needsConvert && !needsShrink) return input;

  // Unsupported formats are left for the caller's own format check to reject.
  if (!isJpeg && !isPng && format !== "jpeg") return input;

  const base = () => {
    let p = sharp(input, { failOn: "none" }).rotate(); // auto-orient
    if (needsResize) {
      p = p.resize({
        width: maxLongSide,
        height: maxLongSide,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    return p;
  };

  // Keep PNG as PNG when allowed and small enough.
  if (isPng && format === "keep") {
    const png = await base().png({ compressionLevel: 9 }).toBuffer();
    if (png.length <= maxBytes) return png;
  }

  for (const quality of JPEG_QUALITIES) {
    const jpeg = await base()
      .flatten({ background: "#ffffff" }) // no transparency in JPEG
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (jpeg.length <= maxBytes) return jpeg;
  }

  throw new YouCamError(
    "Image is still too large after resizing.",
    "exceed_max_filesize",
  );
}