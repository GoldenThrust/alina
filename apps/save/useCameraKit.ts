import { useCallback, useEffect, useRef, useState } from "react";
import { loadCameraKit } from "../services/cameraKit";

const IDLE_STATUS = "Waiting for camera...";

function describeQuality(q: YMKQuality): { text: string; ready: boolean } {
  if (!q.hasFace) return { text: "No face detected", ready: false };
  if (q.position === "toosmall") return { text: "Move closer", ready: false };
  if (q.position === "outofboundary")
    return { text: "Keep your face inside the frame", ready: false };
  if (q.position !== "good")
    return { text: "Adjust your distance", ready: false };
  if (q.frontal !== "good")
    return { text: "Look straight at the camera", ready: false };
  if (q.lighting === "notgood")
    return { text: "Improve lighting", ready: false };
  return { text: "✓ Hold still...", ready: true };
}

function cameraErrorMessage(e: unknown): string {
  const code =
    typeof e === "string"
      ? e
      : ((e as { code?: string; error?: string } | null)?.code ??
        (e as { error?: string } | null)?.error ??
        "");

  switch (code) {
    case "error_permission_denied":
      return "Camera permission was denied. Allow camera access and try again.";
    case "error_resolution_unsupported":
      return "Your camera resolution is too low for skin analysis.";
    default:
      return "Could not access the camera.";
  }
}

export function useCameraKit(onCapture: (blob: Blob) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(IDLE_STATUS);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  const onCaptureRef = useRef(onCapture);
  const listenerIds = useRef<unknown[]>([]);
  const openRef = useRef(false);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  });

  const detach = useCallback(() => {
    const ymk = window.YMK;
    if (ymk) {
      for (const id of listenerIds.current) {
        try {
          ymk.removeEventListener(id);
        } catch {
          /* already removed */
        }
      }
    }
    listenerIds.current = [];
  }, []);

  const close = useCallback(() => {
    detach();
    if (openRef.current) {
      try {
        window.YMK?.close();
      } catch {
        /* already closed */
      }
    }
    openRef.current = false;
    setIsOpen(false);
    setIsLoading(false);
    setIsReady(false);
    setStatus(IDLE_STATUS);
  }, [detach]);

  const open = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      await loadCameraKit();
    } catch {
      setError("Could not load the camera module. Check your connection.");
      setIsLoading(false);
      return;
    }

    const ymk = window.YMK;
    if (!ymk) {
      setError("Camera module is unavailable.");
      setIsLoading(false);
      return;
    }

    detach();

    listenerIds.current = [
      ymk.addEventListener("loaded", () => setIsLoading(false)),

      ymk.addEventListener("faceQualityChanged", (q) => {
        const { text, ready } = describeQuality(q);
        setStatus(text);
        setIsReady(ready);
      }),

      ymk.addEventListener("faceDetectionCaptured", async (result) => {
        const image = result.images[0]?.image;
        if (!image) return;

        try {
          const blob =
            typeof image === "string"
              ? await (await fetch(image)).blob()
              : image;

          close();
          onCaptureRef.current(blob);
        } catch (err) {
          console.error("Could not read captured image:", err);
          setError("Could not read the captured image.");
        }
      }),

      ymk.addEventListener("cameraFailed", (e) => {
        setError(cameraErrorMessage(e));
        close();
      }),

      ymk.addEventListener("unsupportedResolution", () => {
        setError(
          "Your camera can't capture HD photos. Try another device or choose a photo instead.",
        );
        close();
      }),

      // Fires if the kit closes itself.
      ymk.addEventListener("closed", () => {
        openRef.current = false;
        setIsOpen(false);
        setIsLoading(false);
        setIsReady(false);
      }),
    ];

    ymk.init({
      faceDetectionMode: "hdskincare",
      imageFormat: "blob",
      language: "enu",
      qualityLevel: "moderate", // face ratio >= 0.65
      countingDuration: 1500, // hold-still time before auto-capture
      hideFlipCameraButton: true,
      videoQuality: "1920p", // 2560 x 1920, needed for HD
    });

    openRef.current = true;
    setIsOpen(true);
    ymk.openCameraKit();
  }, [close, detach]);

  // Release the camera on unmount.
  useEffect(() => {
    return () => {
      detach();
      if (openRef.current) {
        try {
          window.YMK?.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, [detach]);

  return { open, close, isOpen, isLoading, status, isReady, error };
}