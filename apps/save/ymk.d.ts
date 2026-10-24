type YMKQuality = {
  hasFace: boolean;
  position: "good" | "notgood" | "toosmall" | "outofboundary";
  frontal: "good" | "notgood";
  lighting: "good" | "ok" | "notgood";
};

interface YMKCapturedImage {
  phase: number;
  image: string | Blob;
  width: number;
  height: number;
}

interface YMKCaptureResult {
  mode: string;
  images: YMKCapturedImage[];
}

interface YMKInitOptions {
  faceDetectionMode?: "skincare" | "hdskincare" | "makeup" | "comprehensive";
  imageFormat?: "base64" | "blob";
  language?: string;
  width?: number;
  height?: number;
  hideFlipCameraButton?: boolean;
  countingDuration?: number;
  qualityLevel?: "relaxed" | "moderate" | "strict";
  qualityOverrides?: Record<string, number>;
  videoQuality?: "720p" | "1080p" | "1920p";
  disableCameraResolutionCheck?: boolean;
}

interface YMKApi {
  init(options: YMKInitOptions): void;
  openCameraKit(): void;
  close(): void;
  addEventListener(
    event: "faceQualityChanged",
    cb: (q: YMKQuality) => void,
  ): unknown;
  addEventListener(
    event: "faceDetectionCaptured",
    cb: (r: YMKCaptureResult) => void,
  ): unknown;
  addEventListener(event: "cameraFailed", cb: (e: unknown) => void): unknown;
  addEventListener(
    event: "loaded" | "closed" | "opened" | "unsupportedResolution",
    cb: () => void,
  ): unknown;
  removeEventListener(id: unknown): void;
}

interface Window {
  YMK?: YMKApi;
  YMKAsyncInit?: () => void;
}