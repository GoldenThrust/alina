
/* -------------------------------------------------------------------------- */
/*  Errors                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_USER_MESSAGE =
  "We couldn't analyze this photo. Please try again with a clear, well-lit photo.";

/** Safe-to-show messages, keyed by the API's error / error_code values. */
const USER_MESSAGES: Record<string, string> = {
  // Image size / format
  error_below_min_image_size:
    "This photo's resolution is too low. Please use a higher-quality photo.",
  error_exceed_max_image_size: "This photo is too large. Please use a smaller one.",
  exceed_max_filesize: "This photo is too large. Please use a smaller one.",
  unsupported_image_format: "Please use a JPG or PNG photo.",
  error_decode_image: "We couldn't read this photo. Please try a different one.",
  error_download_image: "We couldn't read this photo. Please try again.",

  // Face size / position
  error_src_face_too_small:
    "Your face is too small in the photo. Move closer so it fills more of the frame.",
  error_face_position_too_small:
    "Your face is too small in the photo. Move closer so it fills more of the frame.",
  error_src_face_out_of_bound:
    "Keep your whole face inside the frame, without anything cut off.",
  error_face_position_out_of_boundary:
    "Keep your whole face inside the frame, without anything cut off.",
  error_face_position_invalid:
    "Your whole face needs to be visible, forward-facing and centered.",
  error_no_face: "We couldn't find a face in this photo.",
  error_pose: "We couldn't detect your pose. Face the camera directly.",
  error_face_parsing: "We couldn't analyze your face in this photo. Please retake it.",

  // Lighting
  error_lighting_dark: "The photo is too dark. Find softer, even light and try again.",
  error_insufficient_lighting:
    "The photo is too dark. Find softer, even light and try again.",

  // Face angle
  error_face_not_forward_facing: "Please look directly at the camera.",
  error_face_angle_invalid: "Keep your head straight and look directly at the camera.",
  error_face_angle_upward: "Your head is tilted up. Slightly tilt your head down.",
  error_face_angle_downward: "Your head is tilted down. Slightly tilt your head up.",
  error_face_angle_leftward: "You're turned too far left. Slightly rotate your head right.",
  error_face_angle_rightward: "You're turned too far right. Slightly rotate your head left.",
  error_face_angle_left_tilt: "Your head is tilted left. Gently tilt it right.",
  error_face_angle_right_tilt: "Your head is tilted right. Gently tilt it left.",

  // Content
  error_nsfw_content_detected: "This photo can't be analyzed. Please use a different one.",
  exceed_nsfw_retry_limits: "This photo can't be analyzed. Please use a different one.",

  // Service-side
  RateLimited: "We're busy right now. Please try again in a moment.",
  CreditInsufficiency: "Analysis is temporarily unavailable. Please try again later.",
  Unauthorized: "Analysis is temporarily unavailable. Please try again later.",
  poll_timeout: "The analysis is taking longer than expected. Please try again.",
};

export class YouCamError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message);
    this.name = "YouCamError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** A message that is safe to show to end users. */
  get userMessage(): string {
    return USER_MESSAGES[this.code] ?? DEFAULT_USER_MESSAGE;
  }

  static from(error: unknown): YouCamError {
    if (error instanceof YouCamError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new YouCamError(message, "unknown_internal_error", undefined, error);
  }

  static fromResponse(
    status: number,
    json: Record<string, any>,
    text: string,
  ): YouCamError {
    const code =
      json.error_code ??
      (status === 401 ? "Unauthorized" : status === 429 ? "RateLimited" : `http_${status}`);
    const message = json.error ?? (text.slice(0, 200) || `HTTP ${status}`);
    return new YouCamError(message, code, status, json);
  }
}

