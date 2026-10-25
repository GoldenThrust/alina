/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from "node:fs/promises";
import { YouCamError } from "../errors/YouCamError";
import { httpRequest } from "../common/utils/request";
import { sleep } from "../common/utils/sleep";
import { env } from "../config/env";
import path from "node:path";
import { fileManager } from "../common/files/file";

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

/* -------------------------------------------------------------------------- */
/*  Internals                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // File API limit for images
const MAX_RATE_LIMIT_RETRIES = 3;

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
    return process.env.YOUCAM_BASE_URL ?? "https://yce-api-01.makeupar.com";
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

    console.log(`YouCamService.request: ${method} ${url}`, headers);

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

  /**
   * File API flow: (1) register metadata, (2) PUT the bytes to the pre-signed
   * URL. Skipping step 2 makes later tasks fail with 404 / unknown_internal_error.
   */
  static async uploadImageDetailed(
    source: string | Buffer,
    fileName?: string,
  ): Promise<UploadedImage> {
    const buffer = typeof source === "string" ? await readFile(fileManager.getUploadedFilePath(source)) : source;
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
  ): Promise<string> {
    return (await this.uploadImageDetailed(source, fileName)).fileId;
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
