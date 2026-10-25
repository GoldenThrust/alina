import { useEffect, useState, type RefObject } from "react";
import { initFaceDetector, detectFace } from "../services/faceAnalyzer";
import { brightness, blurScore } from "../services/imageQuality";

const IDLE_STATUS = "Waiting for camera...";
const ANALYSIS_WIDTH = 320;
const OVERLAY_WIDTH = 640; // fixed backing size for the overlay, CSS scales it
const FACE_INTERVAL_MS = 80; // ~12 face detections per second
const QUALITY_INTERVAL_MS = 300;
const BLUR_MIN = 20; // re-tune: log `blur` on good/bad frames (now measured on the face crop)
const DARK_MAX = 60;
const BRIGHT_MIN = 220;
const MIN_FACE_RATIO = 0.5;

export function useFaceQuality(
  videoRef: RefObject<HTMLVideoElement | null>,
  analysisCanvasRef: RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
) {
  const [status, setStatus] = useState(IDLE_STATUS);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let frame = 0;
    let lastFaceAt = 0;
    let lastQualityAt = 0;
    let lastFaces: ReturnType<typeof detectFace> = [];
    let qualityStatus = "";
    let lastStatus = "";

    const update = (next: string) => {
      if (next !== lastStatus) {
        lastStatus = next;
        setStatus(next);
      }
    };

    async function start() {
      try {
        await initFaceDetector();
      } catch (error) {
        console.error("Face detector failed to load:", error);
        if (!cancelled) update("Face detection unavailable");
        return;
      }

      if (cancelled) return;

      const loop = (now: number) => {
        if (cancelled) return;
        // Schedule first so an early exit below never stops the loop.
        frame = requestAnimationFrame(loop);

        const video = videoRef.current;
        const analysis = analysisCanvasRef.current;
        const overlay = overlayCanvasRef.current;

        if (!video || !analysis || !overlay) return;
        if (video.readyState < 2 || !video.videoWidth) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Overlay uses a small fixed backing size; coordinates are scaled by `s`.
        const ow = OVERLAY_WIDTH;
        const oh = Math.max(1, Math.round((OVERLAY_WIDTH * vh) / vw));
        if (overlay.width !== ow || overlay.height !== oh) {
          overlay.width = ow;
          overlay.height = oh;
        }
        const s = ow / vw;

        const overlayCtx = overlay.getContext("2d");
        overlayCtx?.clearRect(0, 0, ow, oh);

        // Throttled face detection; the box is redrawn every frame from the last result.
        if (now - lastFaceAt >= FACE_INTERVAL_MS) {
          lastFaceAt = now;
          lastFaces = detectFace(video);
        }
        const faces = lastFaces;

        if (faces.length === 0) {
          update("No face detected");
          return;
        }

        if (faces.length > 1) {
          update("Only one face allowed");
          return;
        }

        const box = faces[0].boundingBox;
        if (!box) {
          update("No face detected");
          return;
        }

        const cx = box.originX + box.width / 2;
        const cy = box.originY + box.height / 2;
        const distance = Math.hypot(cx - vw / 2, cy - vh / 2);
        const centered = distance <= vw * 0.15;
        const sizeRatio = box.height / vh;
        const closeEnough = sizeRatio >= MIN_FACE_RATIO;

        if (overlayCtx) {
          overlayCtx.strokeStyle =
            centered && closeEnough ? "#00ff99" : "#ffb020";
          overlayCtx.lineWidth = 3;
          overlayCtx.strokeRect(
            box.originX * s,
            box.originY * s,
            box.width * s,
            box.height * s,
          );
        }

        if (!closeEnough) {
          update("Move closer");
          return;
        }

        if (!centered) {
          update("Center your face");
          return;
        }

        // Throttled quality checks on a downscaled crop of the face region.
        if (now - lastQualityAt >= QUALITY_INTERVAL_MS || !qualityStatus) {
          lastQualityAt = now;

          // Clamp the face box to the frame so drawImage never reads outside it.
          const sx = Math.max(0, Math.min(vw - 1, box.originX));
          const sy = Math.max(0, Math.min(vh - 1, box.originY));
          const sw = Math.max(1, Math.min(vw - sx, box.width));
          const sh = Math.max(1, Math.min(vh - sy, box.height));

          const aw = ANALYSIS_WIDTH;
          const ah = Math.max(1, Math.round((ANALYSIS_WIDTH * sh) / sw));
          if (analysis.width !== aw || analysis.height !== ah) {
            analysis.width = aw;
            analysis.height = ah;
          }

          const ctx = analysis.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, aw, ah);

          const light = brightness(analysis);
          const blur = blurScore(analysis);

          if (light < DARK_MAX) qualityStatus = "Too dark. Improve lighting";
          else if (light > BRIGHT_MIN) qualityStatus = "Too bright";
          else if (blur < BLUR_MIN) qualityStatus = "Image blurry";
          else qualityStatus = "✓ Ready for scan";
        }

        update(qualityStatus);
      };

      frame = requestAnimationFrame(loop);
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, videoRef, analysisCanvasRef, overlayCanvasRef]);

  return active ? status : IDLE_STATUS;
}