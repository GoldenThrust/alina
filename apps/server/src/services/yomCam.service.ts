/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { YouCamError } from "../errors/YouCamError";
import { httpRequest } from "../common/utils/request";
import { sleep } from "../common/utils/sleep";
import { env } from "../config/env";
import path from "node:path";
import { fileManager } from "../common/files/file";
import { fitImage, type ImageLimits } from "../common/utils/image";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export const HD_SKIN_ACTIONS = [
  "hd_acne",
  "hd_droopy_lower_eyelid",
  "hd_eye_bag",
  "hd_moisture",
  "hd_pore",
  "hd_redness",
  "hd_texture",
  "hd_skin_type",
  "hd_dark_circle",
  "hd_droopy_upper_eyelid",
  "hd_firmness",
  "hd_oiliness",
  "hd_radiance",
  "hd_age_spot",
  "hd_wrinkle",
  "hd_tear_trough",
] as const;

const FITZPATRICK_INFO: Record<
  FitzpatrickType,
  { label: string; sunReaction: string }
> = {
  I: { label: "White", sunReaction: "Almost always burns, never tans" },
  II: { label: "Beige", sunReaction: "Usually burns, tans minimally" },
  III: { label: "Light Brown", sunReaction: "Sometimes burns, gradually tans" },
  IV: { label: "Medium Brown", sunReaction: "Rarely burns, tans easily" },
  V: { label: "Dark Brown", sunReaction: "Very rarely burns" },
  VI: { label: "Very Dark Brown", sunReaction: "Almost never burns" },
};

/* ------------------------------ shared (new) ------------------------------ */

/**
 * Result images are hosted by YouCam for only 2 hours, so every feature that
 * produces an image saves it through `fileManager` by default.
 */
export type SaveOptions = {
  /** Save the result image(s) via FileManager. Default: true. */
  save?: boolean;
  /** Sub-directory under `uploads/image`. Each feature has its own default. */
  saveDirectory?: string;
};

/* ----------------------------- aging simulation ---------------------------- */

export type AgingOptions = SaveOptions & { poll?: PollOptions };

export type AgingImage = {
  /** Temporary YouCam URL (valid 2 hours). */
  url: string;
  /** Age the engine generated this image for. */
  age: number;
  /** Saved file path (`uploads/image/...`) when saving is enabled. */
  path?: string;
};

export type AgingResult = {
  /** Age the engine estimates for the uploaded photo. */
  estimatedAge?: number;
  /** Index in `images` that corresponds to the uploaded photo. */
  originalIndex?: number;
  minAge?: number;
  maxAge?: number;
  count?: number;
  /** Ordered youngest to oldest. */
  images: AgingImage[];
};

/* ---------------------------- skin simulation ------------------------------ */

export const SKIN_SIMULATION_CONCERNS = [
  "wrinkle",
  "radiance",
  "oiliness",
  "acne",
  "eye_bags",
  "dark_circle",
  "spots",
  "pores",
  "texture",
  "redness",
] as const;

export type SkinSimulationConcern = (typeof SKIN_SIMULATION_CONCERNS)[number];

/** 0.0 = original skin, 1.0 = strongest improvement. At least one must be > 0. */
export type SkinSimulationIntensities = Partial<
  Record<SkinSimulationConcern, number>
>;

export type SkinSimulationOptions = SaveOptions & {
  intensities: SkinSimulationIntensities;
  poll?: PollOptions;
};

export type SkinSimulationResult = {
  /** Temporary YouCam URL (valid 2 hours). */
  url: string;
  /** Saved file path (`uploads/image/...`) when saving is enabled. */
  path?: string;
  intensities: Record<string, number>;
};

/* ------------------------------ face reshape ------------------------------- */

const RANGE_SIGNED = [-100, 100] as const;
const RANGE_UNSIGNED = [0, 100] as const;

/** Allowed range for every face-reshape feature (from the API schema). */
export const FACE_RESHAPE_FEATURE_RANGES = {
  // Face
  cheekbones: RANGE_UNSIGNED,
  jaw: RANGE_UNSIGNED,
  face_reshape: RANGE_SIGNED,
  face_reshape_left: RANGE_SIGNED,
  face_reshape_right: RANGE_SIGNED,
  face_width: RANGE_SIGNED,
  chin_reshape: RANGE_SIGNED,
  chin_reshape_left: RANGE_SIGNED,
  chin_reshape_right: RANGE_SIGNED,
  chin_length: RANGE_SIGNED,
  // Eyes
  eye_size: RANGE_SIGNED,
  eye_size_left: RANGE_SIGNED,
  eye_size_right: RANGE_SIGNED,
  eye_distance: RANGE_SIGNED,
  eye_angle: RANGE_SIGNED,
  eye_height: RANGE_SIGNED,
  eye_width: RANGE_SIGNED,
  // Nose
  nose_bridge_width: RANGE_SIGNED,
  nose_lift: RANGE_SIGNED,
  nose_size: RANGE_SIGNED,
  nose_tip: RANGE_SIGNED,
  nose_tip_width: RANGE_SIGNED,
  nose_wing: RANGE_SIGNED,
  // Lips
  lip_size: RANGE_SIGNED,
  lip_width: RANGE_SIGNED,
  lip_peak: RANGE_SIGNED,
  lip_height_top: RANGE_SIGNED,
  lip_height_bottom: RANGE_SIGNED,
} as const;

export type FaceReshapeFeatureKey = keyof typeof FACE_RESHAPE_FEATURE_RANGES;

/**
 * Integer values. "Left"/"Right" are from the person's perspective, not the
 * viewer's. A per-side key overrides the combined key (`eye_size`, etc.).
 */
export type FaceReshapeFeatures = Partial<Record<FaceReshapeFeatureKey, number>>;

export type FaceBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FaceReshapeOptions = SaveOptions & {
  features: FaceReshapeFeatures;
  /** Which detected face to reshape (from `detectReshapeFaces`). Default 0. */
  faceIndex?: number;
  /** Run face detection first and reshape the largest face. Ignored if `faceIndex` is set. */
  autoSelectFace?: boolean;
  /** 0–100. Default 0 (no smoothing). */
  skinSmoothStrength?: number;
  /** 0–100. Default 0. */
  skinSmoothColorIntensity?: number;
  poll?: PollOptions;
};

export type FaceReshapeResult = {
  /** Temporary YouCam URL (valid 2 hours). */
  url: string;
  /** Saved file path (`uploads/image/...`) when saving is enabled. */
  path?: string;
  faceIndex: number;
  processingSeconds?: number;
  applySeconds?: number;
};

/* ---------------------- face attributes & ratio analysis ------------------- */

/** Every feature the API accepts. */
export const FACE_ATTR_FEATURES = [
  // Face / age / gender
  "faceShape",
  "age",
  "gender",
  // Eyes
  "eyeShape",
  "eyeSize",
  "eyeAngle",
  "eyeDistance",
  "eyelid",
  // Brows
  "eyebrowShape",
  "eyebrowThickness",
  "eyebrowDistance",
  "eyebrowShortness",
  // Lips, nose, cheekbones
  "lipShape",
  "noseWidth",
  "noseLength",
  "cheekbones",
  // Colors
  "eyeColor",
  "lipColor",
  "eyebrowColor",
  "hairColor",
  // Ratios
  "horizontalThird",
  "verticalFifth",
  "faceAspectRatio",
  "eyeAspectRatio",
  "eyebrowPosition",
  "eyebrowArch",
  "eyeHeightToEyebrowDistance",
  "noseAspectRatio",
  "noseWidthToMouthWidth",
  "noseToLipToChin",
  "upperLipToLowerLip",
] as const;

export type FaceAttrFeature = (typeof FACE_ATTR_FEATURES)[number];

/**
 * Default selection: the 26 attributes and ratios listed in the docs' Inputs &
 * Outputs tables (15–28 features = 30 units). Colors and `eyebrowPosition` are
 * opt-in.
 */
export const FACE_ATTR_DEFAULT_FEATURES: readonly FaceAttrFeature[] = [
  "faceShape",
  "age",
  "gender",
  "eyeShape",
  "eyeSize",
  "eyeAngle",
  "eyeDistance",
  "eyelid",
  "eyebrowShape",
  "eyebrowThickness",
  "eyebrowDistance",
  "eyebrowShortness",
  "lipShape",
  "noseWidth",
  "noseLength",
  "cheekbones",
  "horizontalThird",
  "verticalFifth",
  "faceAspectRatio",
  "eyeAspectRatio",
  "eyebrowArch",
  "eyeHeightToEyebrowDistance",
  "noseAspectRatio",
  "noseWidthToMouthWidth",
  "noseToLipToChin",
  "upperLipToLowerLip",
];

/**
 * strict: pitch ≤4°, yaw ≤6°, roll ≤4° · high: all ≤10° · medium: ≤15° ·
 * low: ≤20° · flexible: ≤30°. API default is "high".
 */
export type FaceAngleStrictness =
  | "strict"
  | "high"
  | "medium"
  | "low"
  | "flexible";

export type FaceAnalysisOptions = {
  features?: readonly FaceAttrFeature[];
  faceAngleStrictness?: FaceAngleStrictness;
  poll?: PollOptions;
};

/** `[1, r]` style ratio, e.g. `[1, 1.46]` for the face aspect ratio. */
type Ratio = number[];

export type FaceAnalysisResult = {
  faceQuality?: {
    hasFace?: boolean;
    area?: string;
    frontal?: string;
    lighting?: string;
    faceAngle?: string;
  };
  faceShape?: string;
  ageGender?: { age?: number; gender?: "female" | "male" | "unknown" };
  /** left_/right_ eyelid, shape and angle, plus `size` and `setting` (distance). */
  eyes?: Record<string, string>;
  /** gap, left_/right_ shape, body/tail thickness, thinness and shortness. */
  eyebrows?: Record<string, string>;
  lipShapes?: string[];
  nose?: { width?: string; length?: string };
  cheekbones?: { left?: string; right?: string; overall?: string };
  colors?: {
    eyeColor?: string;
    eyeColorName?: string;
    lipColor?: string;
    eyebrowColor?: string;
    hairColor?: string;
    hairColorName?: string;
  };
  /** Percent sections or `[1, r]` ratios keyed by the API's result names. */
  ratios?: Record<string, Ratio>;
  /** Untouched API payload. */
  raw: Record<string, any>;
};

/* -------------------------------------------------------------------------- */
/*  Internals                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // File API limit for images
const MAX_RATE_LIMIT_RETRIES = 3;

/**
 * Per-feature image limits (from the YouCam docs). Images are scaled down to
 * fit before upload, never up. `DEFAULT_IMAGE_LIMITS` applies when a caller
 * uploads without naming a feature: 2560px is the strictest long-side limit,
 * so the returned file_id works with every feature.
 */
const DEFAULT_IMAGE_LIMITS: ImageLimits = { maxLongSide: 2560 };
export const YOUCAM_IMAGE_LIMITS = {
  /** Skin analysis, skin tone and Fitzpatrick: long side <= 2560. */
  analysis: { maxLongSide: 2560 },
  /** Aging: JPEG only, long side <= 4096. PNG input is converted. */
  aging: { maxLongSide: 4096, format: "jpeg" },
  /** Skin simulation: short side >= 480, long side <= 2560. */
  skinSimulation: { maxLongSide: 2560, minShortSide: 480 },
  /** Face reshape: long side <= 4096. */
  faceReshape: { maxLongSide: 4096 },
  /** Face attribute & ratio analysis: short side >= 320, long side <= 4096. */
  faceAnalysis: { maxLongSide: 4096, minShortSide: 320 },
} as const;

/** Identifies JPEG / PNG from magic bytes (the File API needs an accurate content_type). */
function detectImageType(buf: Buffer): {
  contentType: "image/jpg" | "image/png";
  ext: "jpg" | "png";
} {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: "image/jpg", ext: "jpg" };
  }
  if (
    buf.length > 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: "image/png", ext: "png" };
  }
  throw new YouCamError(
    "Only JPEG and PNG images are supported.",
    "unsupported_image_format",
  );
}

async function settle<T>(fn: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: YouCamError.from(error) };
  }
}

function assertNumber(
  name: string,
  value: unknown,
  min: number,
  max: number,
  integer = false,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new YouCamError(
      `${name} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`,
      "invalid_parameter",
    );
  }
}

function buildSkinSimulationIntensities(
  input: SkinSimulationIntensities,
): Record<string, number> {
  const known = SKIN_SIMULATION_CONCERNS as readonly string[];
  const out: Record<string, number> = {};

  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined) continue;
    if (!known.includes(key)) {
      throw new YouCamError(
        `Unknown skin simulation concern "${key}".`,
        "invalid_parameter",
      );
    }
    assertNumber(key, value, 0, 1);
    out[key] = value;
  }

  if (!Object.values(out).some((v) => v > 0)) {
    throw new YouCamError(
      "At least one skin simulation intensity must be greater than 0.",
      "invalid_parameter",
    );
  }
  return out;
}

function buildFaceReshapeFeatures(
  input: FaceReshapeFeatures,
): Record<string, number> {
  const out: Record<string, number> = {};

  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined) continue;
    const range = (
      FACE_RESHAPE_FEATURE_RANGES as Record<string, readonly [number, number]>
    )[key];
    if (!range) {
      throw new YouCamError(
        `Unknown face reshape feature "${key}".`,
        "invalid_parameter",
      );
    }
    assertNumber(key, value, range[0], range[1], true);
    out[key] = value;
  }

  if (!Object.values(out).some((v) => v !== 0)) {
    throw new YouCamError(
      "At least one face reshape feature must be non-zero.",
      "invalid_parameter",
    );
  }
  return out;
}

function buildFaceAttrFeatures(
  input: readonly FaceAttrFeature[] | undefined,
): FaceAttrFeature[] {
  const features = [...new Set(input ?? FACE_ATTR_DEFAULT_FEATURES)];
  if (features.length === 0) {
    throw new YouCamError(
      "Select at least one face attribute or ratio feature.",
      "invalid_parameter",
    );
  }
  const known = FACE_ATTR_FEATURES as readonly string[];
  const unknown = features.filter((f) => !known.includes(f));
  if (unknown.length) {
    throw new YouCamError(
      `Unknown face analysis feature(s): ${unknown.join(", ")}`,
      "invalid_parameter",
    );
  }
  return features;
}

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Server-side client for the YouCam (Perfect Corp) APIs.
 * Never use this in the browser: it needs your secret API key (YOUCAM_API_KEY).
 */
export class YouCamService {
  /** Override with YOUCAM_BASE_URL if your account uses another host. */
  static get baseUrl(): string {
    return env.YOUCAM_BASE_URL;
  }

  static get imageUploadUrl() {
    return `${this.baseUrl}/s2s/v2.0/file`;
  }
  static get skinAnalysisUrl() {
    return `${this.baseUrl}/s2s/v2.1/task/skin-analysis`;
  }
  static get facialToneUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/skin-tone-analysis`;
  }
  static get fitzpatrickScaleUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/fitzpatrick-scale-analyzer`;
  }
  static get agingUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/aging`;
  }
  static get skinSimulationUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/skin-simulation`;
  }
  static get faceReshapeUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/face-reshape`;
  }
  static get faceReshapePreprocessUrl() {
    return `${this.faceReshapeUrl}/pre-process`;
  }
  static get faceAttrAnalysisUrl() {
    return `${this.baseUrl}/s2s/v2.0/task/face-attr-analysis`;
  }

  /** Request defaults. `src_file_id` is added per request. */
  static skinAnalysisDefaults: {
    miniserver_args: SkinAnalysisMiniserverArgs;
    format: "json" | "zip";
    pf_camera_kit: boolean;
  } = {
    miniserver_args: { enable_mask_overlay: true },
    format: "json",
    pf_camera_kit: false,
  };

  static fitzpatrickScaleDefaults = { version: "1.0" as const };

  /* ------------------------------ transport ------------------------------ */

  /** Authenticated JSON request. Throws YouCamError on non-2xx. Retries 429s. */
  private static async request<T>(
    method: Method,
    url: string,
    body?: unknown,
  ): Promise<T> {
    const headers = {
      Authorization: `Bearer ${env.YOUCAM_API_KEY}`,
      "Content-Type": "application/json",
    };

    for (let attempt = 0; ; attempt++) {
      const res = await httpRequest(method, url, {
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfter = Number(res.headers["retry-after"]);
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * 2 ** attempt,
        );
        continue;
      }

      if (!res.ok)
        throw YouCamError.fromResponse(res.status, res.json, res.text);
      return res.json as T;
    }
  }

  private static async createTask(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const res = await this.request<
      TaskEnvelope<unknown> & { data?: { task_id?: string } }
    >("POST", url, payload);
    const taskId = res.data?.task_id;
    if (!taskId) {
      throw new YouCamError(
        "Response did not include a task_id",
        "invalid_response",
        undefined,
        res,
      );
    }
    return taskId;
  }

  /** Polls a task until success/error. Throws YouCamError on error or timeout. */
  private static async pollTask<R>(
    url: string,
    poll: PollOptions = {},
  ): Promise<TaskData<R>> {
    const {
      intervalMs = 2000,
      maxIntervalMs = 10_000,
      timeoutMs = 180_000,
    } = poll;
    const startedAt = Date.now();
    let delay = intervalMs;

    for (;;) {
      const res = await this.request<TaskEnvelope<R>>("GET", url);
      const data = res.data ?? {};

      if (data.task_status === "error" || data.error) {
        throw new YouCamError(
          data.error_message ?? data.error ?? "Task failed",
          data.error ?? "unknown_internal_error",
          undefined,
          data,
        );
      }

      // The Fitzpatrick docs omit task_status, so also accept "results present".
      if (
        data.task_status === "success" ||
        (data.task_status === undefined && data.results !== undefined)
      ) {
        return data;
      }

      if (Date.now() - startedAt + delay > timeoutMs) {
        throw new YouCamError(
          "Timed out waiting for the task to finish",
          "poll_timeout",
        );
      }

      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.5), maxIntervalMs);
    }
  }

  /* ------------------------------- upload -------------------------------- */

  private static async toBuffer(source: string | Buffer): Promise<Buffer> {
    return typeof source === "string"
      ? readFile(fileManager.getUploadedFilePath(source))
      : source;
  }

  /**
   * File API flow: (1) register metadata, (2) PUT the bytes to the pre-signed
   * URL. Skipping step 2 makes later tasks fail with 404 / unknown_internal_error.
   */
  static async uploadImageDetailed(
    source: string | Buffer,
    fileName?: string,
    limits: ImageLimits = DEFAULT_IMAGE_LIMITS,
  ): Promise<UploadedImage> {
    // Downscale (never upscale) to the feature's limits before uploading.
    const buffer = await fitImage(await this.toBuffer(source), limits);
    const { contentType, ext } = detectImageType(buffer);

    if (buffer.length >= MAX_IMAGE_BYTES) {
      throw new YouCamError(
        "Image must be smaller than 10MB.",
        "exceed_max_filesize",
      );
    }

    const created = await this.request<FileApiResponse>(
      "POST",
      this.imageUploadUrl,
      {
        files: [
          {
            content_type: contentType,
            file_name: fileName ?? `scan-${Date.now()}.${ext}`,
            file_size: buffer.length,
          },
        ],
      },
    );

    const file = (created.data?.files ?? created.files)?.[0];
    const target = file?.requests?.[0];
    if (!file?.file_id || !target?.url) {
      throw new YouCamError(
        "File API response was missing file_id or upload url",
        "invalid_response",
        undefined,
        created,
      );
    }

    // Use the headers the API gives us. Content-Length is derived from the body.
    const uploadHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(target.headers ?? {})) {
      if (key.toLowerCase() !== "content-length")
        uploadHeaders[key] = String(value);
    }

    const put = await fetch(target.url, {
      method: target.method ?? "PUT",
      headers: uploadHeaders,
      body: buffer as unknown as BodyInit,
    });

    if (!put.ok) {
      throw new YouCamError(
        `Image upload failed (${put.status})`,
        "upload_failed",
        put.status,
        await put.text().catch(() => ""),
      );
    }

    return { fileId: file.file_id, contentType, size: buffer.length };
  }

  /** Uploads an image (file path or Buffer) and returns its file_id. */
  static async uploadImage(
    source: string | Buffer,
    fileName?: string,
    limits?: ImageLimits,
  ): Promise<string> {
    return (await this.uploadImageDetailed(source, fileName, limits)).fileId;
  }

  /* ----------------------- saving result images (new) --------------------- */

  /** Downloads a YouCam result URL and stores it through FileManager. */
  private static async persistImage(
    url: string,
    directory: string,
  ): Promise<string> {
    try {
      return await fileManager.saveRemoteFile(url, "image", directory);
    } catch (error) {
      throw new YouCamError(
        `Result was generated but could not be saved: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "save_failed",
        undefined,
        { url },
      );
    }
  }

  /** Saves several images; if any fails, removes the ones already saved. */
  private static async persistImages(
    urls: string[],
    directory: string,
  ): Promise<string[]> {
    const settled = await Promise.allSettled(
      urls.map((url) => this.persistImage(url, directory)),
    );

    const failed = settled.find((s) => s.status === "rejected");
    if (failed) {
      for (const s of settled) {
        if (s.status === "fulfilled") {
          try {
            fileManager.deleteUploadedFile(s.value);
          } catch {
            /* best effort cleanup */
          }
        }
      }
      throw (failed as PromiseRejectedResult).reason;
    }
    return settled.map((s) => (s as PromiseFulfilledResult<string>).value);
  }

  /* ---------------------------- skin analysis ---------------------------- */

  static createSkinAnalysisTask(
    fileId: string,
    options: SkinAnalysisOptions = {},
  ) {
    const defaults = this.skinAnalysisDefaults;
    return this.createTask(this.skinAnalysisUrl, {
      src_file_id: fileId,
      dst_actions: [...(options.dstActions ?? HD_SKIN_ACTIONS)],
      miniserver_args: {
        ...defaults.miniserver_args,
        ...options.miniserverArgs,
      },
      format: defaults.format,
      pf_camera_kit: options.pfCameraKit ?? defaults.pf_camera_kit,
    });
  }

  static async waitForSkinAnalysis(
    taskId: string,
    poll?: PollOptions,
  ): Promise<SkinAnalysisResult> {
    const data = await this.pollTask<{
      output?: SkinAnalysisOutputItem[];
      url?: string;
    }>(`${this.skinAnalysisUrl}/${encodeURIComponent(taskId)}`, poll);

    const output = data.results?.output;
    if (!Array.isArray(output)) {
      throw new YouCamError(
        "Skin analysis returned no `output` (is format set to 'json'?)",
        "invalid_response",
        undefined,
        data,
      );
    }
    const concerns: SkinAnalysisResult["concerns"] = {};
    let overallScore: number | undefined;
    let skinAge: number | undefined;

    for (const item of output) {
      switch (item.type) {
        case "all":
          overallScore = item.score;
          continue;
        case "skin_age":
          skinAge = item.score;
          continue;
      }
      if (!item.type) continue;
      (concerns[item.type] ??= {})[item.region ?? "whole"] =
        item.raw_score ?? item.skin_type ?? 0;
    }

    return {
      overallScore,
      skinAge,
      concerns,
      output,
    };
  }

  static async analyzeSkin(fileId: string, options: SkinAnalysisOptions = {}) {
    const taskId = await this.createSkinAnalysisTask(fileId, options);
    return this.waitForSkinAnalysis(taskId, options.poll);
  }

  /* ------------------------- facial color tones -------------------------- */

  static createSkinToneTask(fileId: string, options: SkinToneOptions = {}) {
    return this.createTask(this.facialToneUrl, {
      src_file_id: fileId,
      ...(options.faceAngleStrictness
        ? { face_angle_strictness_level: options.faceAngleStrictness }
        : {}),
    });
  }

  static async waitForSkinTone(
    taskId: string,
    poll?: PollOptions,
  ): Promise<SkinToneResult> {
    const data = await this.pollTask<{
      color?: Record<string, string>;
      face_quality?: Record<string, any>;
    }>(`${this.facialToneUrl}/${encodeURIComponent(taskId)}`, poll);

    const color = data.results?.color;
    if (!color) {
      throw new YouCamError(
        "Skin tone analysis returned no color data",
        "invalid_response",
        undefined,
        data,
      );
    }

    const fq = data.results?.face_quality;
    return {
      skinColor: color.skin_color,
      eyeColor: color.eye_color,
      eyeColorName: color.eye_color_name,
      lipColor: color.lip_color,
      eyebrowColor: color.eyebrow_color,
      hairColor: color.hair_color,
      hairColorName: color.hair_color_name,
      faceQuality: fq
        ? {
            hasFace: fq.has_face,
            area: fq.area,
            frontal: fq.frontal,
            lighting: fq.lighting,
            faceAngle: fq.faceangle,
          }
        : undefined,
    };
  }

  static async analyzeSkinTone(fileId: string, options: SkinToneOptions = {}) {
    const taskId = await this.createSkinToneTask(fileId, options);
    return this.waitForSkinTone(taskId, options.poll);
  }

  /* --------------------------- Fitzpatrick scale ------------------------- */

  static createFitzpatrickTask(
    fileId: string,
    options: FitzpatrickOptions = {},
  ) {
    return this.createTask(this.fitzpatrickScaleUrl, {
      ...this.fitzpatrickScaleDefaults,
      src_file_id: fileId,
      ...(options.index !== undefined ? { index: options.index } : {}),
    });
  }

  static async waitForFitzpatrick(
    taskId: string,
    poll?: PollOptions,
  ): Promise<FitzpatrickResult> {
    const data = await this.pollTask<{
      fitzpatrick_scale?: FitzpatrickType;
      timed?: number;
    }>(`${this.fitzpatrickScaleUrl}/${encodeURIComponent(taskId)}`, poll);

    const type = data.results?.fitzpatrick_scale;
    if (!type || !(type in FITZPATRICK_INFO)) {
      throw new YouCamError(
        "Fitzpatrick analysis returned no skin type",
        "invalid_response",
        undefined,
        data,
      );
    }

    return {
      type,
      ...FITZPATRICK_INFO[type],
      processingSeconds: data.results?.timed,
    };
  }

  static async analyzeFitzpatrick(
    fileId: string,
    options: FitzpatrickOptions = {},
  ) {
    const taskId = await this.createFitzpatrickTask(fileId, options);
    return this.waitForFitzpatrick(taskId, options.poll);
  }

  /* --------------------------- aging simulation -------------------------- */

  /**
   * Generates a series of photos from youth to old age from one selfie.
   * JPEG only, long side ≤ 4096, single face (yaw ±30°, roll ±20°, pitch ±20°).
   * Costs 2 units.
   */
  static createAgingTask(fileId: string) {
    return this.createTask(this.agingUrl, { src_file_id: fileId });
  }

  static async waitForAging(
    taskId: string,
    options: AgingOptions = {},
  ): Promise<AgingResult> {
    const data = await this.pollTask<{
      output?: { url: string; res_age: number }[];
      age?: number;
      agd_idx?: number;
      age_min?: number;
      age_max?: number;
      num_of_photos?: number;
    }>(`${this.agingUrl}/${encodeURIComponent(taskId)}`, options.poll);

    const output = data.results?.output;
    if (!Array.isArray(output) || output.length === 0) {
      throw new YouCamError(
        "Aging simulation returned no images",
        "invalid_response",
        undefined,
        data,
      );
    }

    const images: AgingImage[] = output.map((o) => ({
      url: o.url,
      age: o.res_age,
    }));

    if (options.save !== false) {
      // One folder per run keeps the whole series together.
      const directory = path.join(options.saveDirectory ?? "aging", randomUUID());
      const paths = await this.persistImages(
        images.map((i) => i.url),
        directory,
      );
      images.forEach((image, i) => (image.path = paths[i]));
    }

    return {
      estimatedAge: data.results?.age,
      originalIndex: data.results?.agd_idx,
      minAge: data.results?.age_min,
      maxAge: data.results?.age_max,
      count: data.results?.num_of_photos ?? images.length,
      images,
    };
  }

  static async simulateAging(fileId: string, options: AgingOptions = {}) {
    const taskId = await this.createAgingTask(fileId);
    return this.waitForAging(taskId, options);
  }

  /** Uploads (converted to JPEG, <= 4096px) and runs the aging simulation. */
  static async simulateAgingImage(
    source: string | Buffer,
    options: AgingOptions = {},
  ) {
    const fileId = await this.uploadImage(
      source,
      undefined,
      YOUCAM_IMAGE_LIMITS.aging,
    );
    return { fileId, ...(await this.simulateAging(fileId, options)) };
  }

  /* --------------------------- skin simulation --------------------------- */

  /**
   * Shows the effect of improving skin concerns. Each intensity is 0.0–1.0 and
   * at least one must be > 0. JPEG/PNG, short side ≥ 480, long side ≤ 2560,
   * face ≥ 60% of the image width. Costs 4 units for 1–4 concerns, 6 for 5–10.
   */
  static createSkinSimulationTask(
    fileId: string,
    intensities: SkinSimulationIntensities,
  ) {
    return this.createTask(this.skinSimulationUrl, {
      src_file_id: fileId,
      ...buildSkinSimulationIntensities(intensities),
    });
  }

  static async waitForSkinSimulation(
    taskId: string,
    options: Omit<SkinSimulationOptions, "intensities"> & {
      intensities?: Record<string, number>;
    } = {},
  ): Promise<SkinSimulationResult> {
    const data = await this.pollTask<{ url?: string }>(
      `${this.skinSimulationUrl}/${encodeURIComponent(taskId)}`,
      options.poll,
    );

    const url = data.results?.url;
    if (!url) {
      throw new YouCamError(
        "Skin simulation returned no result url",
        "invalid_response",
        undefined,
        data,
      );
    }

    const savedPath =
      options.save !== false
        ? await this.persistImage(
            url,
            options.saveDirectory ?? "skin-simulation",
          )
        : undefined;

    return { url, path: savedPath, intensities: options.intensities ?? {} };
  }

  static async simulateSkin(fileId: string, options: SkinSimulationOptions) {
    const intensities = buildSkinSimulationIntensities(options.intensities);
    const taskId = await this.createSkinSimulationTask(fileId, intensities);
    return this.waitForSkinSimulation(taskId, { ...options, intensities });
  }

  /** Uploads (JPEG/PNG) and runs the skin simulation. */
  static async simulateSkinImage(
    source: string | Buffer,
    options: SkinSimulationOptions,
  ) {
    // Validate before spending an upload.
    buildSkinSimulationIntensities(options.intensities);
    const fileId = await this.uploadImage(
      source,
      undefined,
      YOUCAM_IMAGE_LIMITS.skinSimulation,
    );
    return { fileId, ...(await this.simulateSkin(fileId, options)) };
  }

  /* ------------------------------ face reshape --------------------------- */

  /**
   * Detects faces and returns their bounding boxes (pixels). The array index is
   * the `faceIndex` to pass to `reshapeFace`. Use it when a photo may contain
   * more than one face.
   */
  static async detectReshapeFaces(
    fileId: string,
    poll?: PollOptions,
  ): Promise<FaceBox[]> {
    const taskId = await this.createTask(this.faceReshapePreprocessUrl, {
      src_file_id: fileId,
    });
    const data = await this.pollTask<{ timed?: number; result?: FaceBox[] }>(
      `${this.faceReshapePreprocessUrl}/${encodeURIComponent(taskId)}`,
      poll,
    );

    const faces = data.results?.result;
    if (!Array.isArray(faces)) {
      throw new YouCamError(
        "Face detection returned no result list",
        "invalid_response",
        undefined,
        data,
      );
    }
    return faces;
  }

  static createFaceReshapeTask(
    fileId: string,
    options: Pick<
      FaceReshapeOptions,
      | "features"
      | "faceIndex"
      | "skinSmoothStrength"
      | "skinSmoothColorIntensity"
    >,
  ) {
    const strength = options.skinSmoothStrength ?? 0;
    const colorIntensity = options.skinSmoothColorIntensity ?? 0;
    assertNumber("skinSmoothStrength", strength, 0, 100, true);
    assertNumber("skinSmoothColorIntensity", colorIntensity, 0, 100, true);
    if (options.faceIndex !== undefined) {
      assertNumber("faceIndex", options.faceIndex, 0, Number.MAX_SAFE_INTEGER, true);
    }

    return this.createTask(this.faceReshapeUrl, {
      src_file_id: fileId,
      version: "1.0",
      ...(options.faceIndex !== undefined ? { index: options.faceIndex } : {}),
      features: buildFaceReshapeFeatures(options.features),
      global: {
        skin_smooth_strength: strength,
        skin_smooth_color_intensity: colorIntensity,
      },
    });
  }

  static async waitForFaceReshape(
    taskId: string,
    options: SaveOptions & { poll?: PollOptions; faceIndex?: number } = {},
  ): Promise<FaceReshapeResult> {
    const data = await this.pollTask<{
      url?: string;
      timed?: number;
      timed_apply?: number;
    }>(`${this.faceReshapeUrl}/${encodeURIComponent(taskId)}`, options.poll);

    const url = data.results?.url;
    if (!url) {
      throw new YouCamError(
        "Face reshape returned no result url",
        "invalid_response",
        undefined,
        data,
      );
    }

    const savedPath =
      options.save !== false
        ? await this.persistImage(url, options.saveDirectory ?? "face-reshape")
        : undefined;

    return {
      url,
      path: savedPath,
      faceIndex: options.faceIndex ?? 0,
      processingSeconds: data.results?.timed,
      applySeconds: data.results?.timed_apply,
    };
  }

  /**
   * Reshapes face, eyes, nose and lips. JPEG/PNG, long side ≤ 4096, face angle
   * under 30°. Costs 1 unit. For multi-face photos pass `faceIndex` (see
   * `detectReshapeFaces`) or set `autoSelectFace` to use the largest face.
   */
  static async reshapeFace(
    fileId: string,
    options: FaceReshapeOptions,
  ): Promise<FaceReshapeResult> {
    // Fail fast on bad input before any network call.
    buildFaceReshapeFeatures(options.features);

    let faceIndex = options.faceIndex;
    if (faceIndex === undefined && options.autoSelectFace) {
      const faces = await this.detectReshapeFaces(fileId, options.poll);
      if (faces.length === 0) {
        throw new YouCamError("No face detected in the image", "error_no_face");
      }
      faceIndex = faces.reduce(
        (best, face, i) =>
          face.width * face.height > faces[best].width * faces[best].height
            ? i
            : best,
        0,
      );
    }

    const taskId = await this.createFaceReshapeTask(fileId, {
      ...options,
      faceIndex,
    });
    return this.waitForFaceReshape(taskId, { ...options, faceIndex });
  }

  /** Uploads (JPEG/PNG) and runs the face reshape. */
  static async reshapeFaceImage(
    source: string | Buffer,
    options: FaceReshapeOptions,
  ) {
    buildFaceReshapeFeatures(options.features);
    const fileId = await this.uploadImage(
      source,
      undefined,
      YOUCAM_IMAGE_LIMITS.faceReshape,
    );
    return { fileId, ...(await this.reshapeFace(fileId, options)) };
  }

  /* ------------------- face attributes & ratio analysis ------------------ */

  /**
   * Pricing depends on how many features you request: 1–5 = 10 units,
   * 6–14 = 20 units, 15–28 = 30 units.
   */
  static createFaceAnalysisTask(
    fileId: string,
    options: FaceAnalysisOptions = {},
  ) {
    return this.createTask(this.faceAttrAnalysisUrl, {
      src_file_id: fileId,
      features: buildFaceAttrFeatures(options.features),
      ...(options.faceAngleStrictness
        ? { face_angle_strictness_level: options.faceAngleStrictness }
        : {}),
    });
  }

  static async waitForFaceAnalysis(
    taskId: string,
    poll?: PollOptions,
  ): Promise<FaceAnalysisResult> {
    const data = await this.pollTask<Record<string, any>>(
      `${this.faceAttrAnalysisUrl}/${encodeURIComponent(taskId)}`,
      poll,
    );

    const r = data.results;
    if (!r || typeof r !== "object") {
      throw new YouCamError(
        "Face analysis returned no results",
        "invalid_response",
        undefined,
        data,
      );
    }

    const fq = r.face_quality;
    const color = r.color;

    return {
      faceQuality: fq
        ? {
            hasFace: fq.has_face,
            area: fq.area,
            frontal: fq.frontal,
            lighting: fq.lighting,
            faceAngle: fq.faceangle,
          }
        : undefined,
      faceShape: r.faceshape,
      ageGender: r.agegender,
      eyes: r.eyelid,
      eyebrows: r.eyebrow,
      lipShapes: r.lipshape,
      nose: r.nose,
      cheekbones: r.cheekbone,
      colors: color
        ? {
            eyeColor: color.eye_color,
            eyeColorName: color.eye_color_name,
            lipColor: color.lip_color,
            eyebrowColor: color.eyebrow_color,
            hairColor: color.hair_color,
            hairColorName: color.hair_color_name,
          }
        : undefined,
      ratios: r.facialratio,
      raw: r,
    };
  }

  static async analyzeFace(fileId: string, options: FaceAnalysisOptions = {}) {
    const taskId = await this.createFaceAnalysisTask(fileId, options);
    return this.waitForFaceAnalysis(taskId, options.poll);
  }

  /** Uploads (JPEG/PNG) and runs the face attribute & ratio analysis. */
  static async analyzeFaceImage(
    source: string | Buffer,
    options: FaceAnalysisOptions = {},
  ) {
    buildFaceAttrFeatures(options.features);
    const fileId = await this.uploadImage(
      source,
      undefined,
      YOUCAM_IMAGE_LIMITS.faceAnalysis,
    );
    return { fileId, ...(await this.analyzeFace(fileId, options)) };
  }

  /* ------------------------------ all-in-one ----------------------------- */

  /**
   * Uploads once, then runs skin analysis, skin tone and Fitzpatrick in
   * parallel. Each feature succeeds or fails independently.
   *
   * Pass the JPEG produced by the front end's resize step (>= 1080px short
   * side, <= 2560px long side). It satisfies all three endpoints.
   */
  static async analyzeImage(
    source: string | Buffer,
    options: AnalyzeImageOptions = {},
  ): Promise<AnalyzeImageResult> {
    const { fileId, contentType } = await this.uploadImageDetailed(source);

    const fitzpatrick: Promise<Settled<FitzpatrickResult>> =
      contentType === "image/png"
        ? Promise.resolve({
            ok: false,
            error: new YouCamError(
              "Fitzpatrick analysis only supports JPEG images.",
              "unsupported_image_format",
            ),
          })
        : settle(() => this.analyzeFitzpatrick(fileId, options.fitzpatrick));

    const [skinAnalysis, skinTone, fitz] = await Promise.all([
      settle(() => this.analyzeSkin(fileId, options.skinAnalysis)),
      settle(() => this.analyzeSkinTone(fileId, options.skinTone)),
      fitzpatrick,
    ]);

    return { fileId, skinAnalysis, skinTone, fitzpatrick: fitz };
  }

  static async analyzeFitzpatrickAndSkinToneImage(
    source: string | Buffer,
    options: AnalyzeImageOptions = {},
  ): Promise<AnalyzeImageResult> {
    const { fileId, contentType } = await this.uploadImageDetailed(source);

    const fitzpatrick: Promise<Settled<FitzpatrickResult>> =
      contentType === "image/png"
        ? Promise.resolve({
            ok: false,
            error: new YouCamError(
              "Fitzpatrick analysis only supports JPEG images.",
              "unsupported_image_format",
            ),
          })
        : settle(() => this.analyzeFitzpatrick(fileId, options.fitzpatrick));

    const [skinTone, fitz] = await Promise.all([
      settle(() => this.analyzeSkinTone(fileId, options.skinTone)),
      fitzpatrick,
    ]);

    return { fileId, skinTone, fitzpatrick: fitz };
  }

  static async analyzeSkinImage(
    source: string | Buffer,
    options: AnalyzeImageOptions = {},
  ): Promise<AnalyzeImageResult> {
    const { fileId } = await this.uploadImageDetailed(source);

    const [skinAnalysis] = await Promise.all([
      settle(() => this.analyzeSkin(fileId, options.skinAnalysis)),
    ]);

    return { fileId, skinAnalysis };
  }
}