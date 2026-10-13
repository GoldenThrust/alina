
interface SkinAnalysisMiniserverArgs {
  /** Blend all masks into a single overlay image. */
  enable_mask_overlay?: boolean;
  enable_dark_background_hd_pore?: boolean;
  /** Hex without "#", e.g. "3D3D3D". */
  color_dark_background_hd_pore?: string;
  opacity_dark_background_hd_pore?: number;
  enable_dark_background_hd_wrinkle?: boolean;
  color_dark_background_hd_wrinkle?: string;
  opacity_dark_background_hd_wrinkle?: number;
}


interface PollOptions {
  /** First wait between polls. Default 2s. */
  intervalMs?: number;
  /** Polling backs off by 1.5x up to this cap. Default 10s. */
  maxIntervalMs?: number;
  /** Give up after this long. Default 3 minutes. */
  timeoutMs?: number;
}

interface SkinAnalysisOptions {
  dstActions?: readonly HdSkinAction[];
  miniserverArgs?: SkinAnalysisMiniserverArgs;
  /**
   * Sent as `pf_camera_kit`. The docs show it in the request example but do not
   * describe it. Defaults to false.
   */
  pfCameraKit?: boolean;
  poll?: PollOptions;
}

interface SkinToneOptions {
  /** API default is "high" (pitch/yaw/roll within 10 degrees). */
  faceAngleStrictness?: "strict" | "high" | "medium" | "low" | "flexible";
  poll?: PollOptions;
}

interface FitzpatrickOptions {
  /** Zero-based face index. Only needed for multi-face images. */
  index?: number;
  poll?: PollOptions;
}

/** One entry of `data.results.output` in the skin analysis JSON response. */
interface SkinAnalysisOutputItem {
  type: string;
  region?: string;
  raw_score?: number;
  ui_score?: number;
  score?: number;
  mask_urls?: string[];
}

interface SkinConcernScore {
  rawScore?: number;
  uiScore?: number;
  maskUrls: string[];
}

interface SkinAnalysisResult {
  /** General skin condition (1-100), taken from whichever output item carries `score`. */
  overallScore?: number;
  /** concerns[type][region], e.g. concerns.hd_pore.forehead. Region defaults to "whole". */
  concerns: Record<string, Record<string, SkinConcernScore>>;
  /** The unmodified `output` array. */
  output: SkinAnalysisOutputItem[];
}

interface SkinToneResult {
  skinColor: string;
  eyeColor: string;
  eyeColorName: string;
  lipColor: string;
  eyebrowColor: string;
  hairColor: string;
  hairColorName: string;
  faceQuality?: {
    hasFace: boolean;
    area: string;
    frontal: string;
    lighting: string;
    faceAngle: string;
  };
}

type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

interface FitzpatrickResult {
  type: FitzpatrickType;
  label: string;
  sunReaction: string;
  processingSeconds?: number;
}

type Settled<T> = { ok: true; data: T } | { ok: false; error: YouCamError };

interface AnalyzeImageOptions {
  skinAnalysis?: SkinAnalysisOptions;
  skinTone?: SkinToneOptions;
  fitzpatrick?: FitzpatrickOptions;
}

interface AnalyzeImageResult {
  fileId: string;
  skinAnalysis?: Settled<SkinAnalysisResult>;
  skinTone?: Settled<SkinToneResult>;
  fitzpatrick?: Settled<FitzpatrickResult>;
}

interface UploadedImage {
  fileId: string;
  contentType: string;
  size: number;
}

interface FileApiEntry {
  file_id?: string;
  requests?: { method?: string; url?: string; headers?: Record<string, string | number> }[];
}

interface FileApiResponse {
  data?: { files?: FileApiEntry[] };
  files?: FileApiEntry[];
}

interface TaskData<R> {
  task_status?: "running" | "success" | "error";
  error?: string | null;
  error_message?: string;
  results?: R;
}

interface TaskEnvelope<R> {
  status?: number;
  data?: TaskData<R>;
}

 const HD_SKIN_ACTIONS = [
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

type HdSkinAction = (typeof HD_SKIN_ACTIONS)[number];
type analysisType = "all" | "skin" | "skin_tone" | "fitzpatrick";

type YouCamAnalysisData = {
  type: analysisType;
  source: string | Buffer;
  options: AnalyzeImageOptions | {};
}