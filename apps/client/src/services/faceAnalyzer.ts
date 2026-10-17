import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let detectorPromise: Promise<FaceDetector> | null = null;
let detector: FaceDetector | null = null;

export function initFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        // Pin this to the version in your package.json
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );

      const d = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.65,
      });

      detector = d;
      return d;
    })().catch((error) => {
      detectorPromise = null; // allow retry
      throw error;
    });
  }

  return detectorPromise;
}

export function detectFace(video: HTMLVideoElement) {
  if (!detector) return [];
  if (video.readyState < 2 || !video.videoWidth) return [];

  return detector.detectForVideo(video, performance.now()).detections;
}