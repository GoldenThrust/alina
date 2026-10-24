import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight,
  BellRing,
  Camera,
  Check,
  Focus,
  Glasses,
  ImagePlus,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sun,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import PageHeading from "../src/components/PageHeading";
import { requestScan } from "../src/services/scan";
import { EASE, container, item } from "../src/utils/motion";

/* ---------- Perfect Corp JS Camera Kit ---------- */

const KIT_SRC = "https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js";

/**
 * "hdskincare" matches the HD analysis fields your backend returns (per-region pore/wrinkle,
 * tear trough, etc.) and needs a webcam that can deliver 2560px on the long side.
 * Switch to "skincare" (and drop videoQuality) for the SD flow.
 */
const KIT_MODE = "hdskincare";
const KIT_VIDEO_QUALITY = "1920p";
/** Docs recommend "strict" or "moderate" for skin analysis. */
const KIT_QUALITY_LEVEL = "moderate";

interface KitQuality {
  hasFace: boolean;
  position: "good" | "notgood" | "toosmall" | "outofboundary";
  frontal: "good" | "notgood";
  lighting: "good" | "ok" | "notgood";
}
interface KitCaptured {
  mode: string;
  images: { phase: number; image: string | Blob; width: number; height: number }[];
}
interface YMKApi {
  init(args: Record<string, unknown>): void;
  openCameraKit(): void;
  close(): void;
  addEventListener(event: string, callback: (payload: never) => void): unknown;
  removeEventListener(id: unknown): void;
}
declare global {
  interface Window {
    YMK?: YMKApi;
    YMKAsyncInit?: () => void;
  }
}

let kitPromise: Promise<YMKApi> | null = null;

/** Loads the SDK once. The SDK calls window.YMKAsyncInit when it is ready. */
function loadKit(): Promise<YMKApi> {
  if (window.YMK) return Promise.resolve(window.YMK);

  kitPromise ??= new Promise<YMKApi>((resolve, reject) => {
    window.YMKAsyncInit = () => resolve(window.YMK as YMKApi);

    const script = document.createElement("script");
    script.src = KIT_SRC;
    script.async = true;
    script.onerror = () => {
      kitPromise = null;
      script.remove();
      reject(new Error("Couldn’t load the camera. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });

  return kitPromise;
}

const isQualityReady = (q: KitQuality | null) =>
  !!q &&
  q.hasFace &&
  q.position === "good" &&
  q.frontal === "good" &&
  (q.lighting === "good" || q.lighting === "ok");

function qualityMessage(q: KitQuality | null): string {
  if (!q || !q.hasFace) return "Looking for your face…";
  if (q.position === "toosmall") return "Move a little closer";
  if (q.position === "outofboundary") return "Center your face in the frame";
  if (q.position !== "good") return "Adjust your distance";
  if (q.frontal !== "good") return "Look straight at the camera";
  if (q.lighting === "notgood") return "Find softer, brighter light";
  return "Hold still…";
}

const KIT_ERRORS: Record<string, string> = {
  error_permission_denied: "Camera permission was denied. Allow camera access and try again.",
  error_access_failed: "We couldn’t access your camera. Is another app using it?",
  error_resolution_unsupported:
    "This camera isn’t high-resolution enough. Try another device, or choose a photo.",
};

/* ---------- UI ---------- */

type Phase = "idle" | "sending" | "sent";
type Mode = "camera" | "upload";
type KitState = "closed" | "loading" | "open";

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "camera", label: "Camera", icon: Camera },
  { id: "upload", label: "Photo", icon: Upload },
];

const TIPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sun, title: "Face the light", text: "Soft, even light, no harsh shadows." },
  { icon: Glasses, title: "Keep it natural", text: "No glasses, no makeup, forehead visible." },
  { icon: Focus, title: "Stay centered", text: "Look at the camera, face inside the frame." },
];

const FLOW: { icon: LucideIcon; title: string }[] = [
  { icon: Camera, title: "Capture" },
  { icon: Send, title: "Send" },
  { icon: BellRing, title: "Get notified" },
];

const layer = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
  transition: { duration: 0.3, ease: EASE },
};

export default function Scan() {
  const [mode, setMode] = useState<Mode>("camera");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [kitState, setKitState] = useState<KitState>("closed");
  const [quality, setQuality] = useState<KitQuality | null>(null);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const listenerIds = useRef<unknown[]>([]);

  const kitActive = kitState !== "closed";
  const isReady = kitState === "open" && isQualityReady(quality);
  const busy = phase === "sending";

  /* ----- Camera Kit lifecycle ----- */

  const closeKit = useCallback(() => {
    try {
      window.YMK?.close();
    } catch {
      /* already closed */
    }
    setKitState("closed");
    setQuality(null);
  }, []);

  /** Registered once per mount; the handlers only use stable state setters. */
  const registerListeners = useCallback(
    (YMK: YMKApi) => {
      if (listenerIds.current.length > 0) return; // already registered

      const on = <T,>(event: string, callback: (payload: T) => void) =>
        listenerIds.current.push(
          YMK.addEventListener(event, callback as (payload: never) => void),
        );

      on("loaded", () => setKitState("open"));
      on<KitQuality>("faceQualityChanged", (q) => setQuality(q));
      on("closed", () => {
        setKitState("closed");
        setQuality(null);
      });
      on<unknown>("cameraFailed", (payload) => {
        const code =
          typeof payload === "string"
            ? payload
            : (payload as { error?: string } | null)?.error;
        setCameraError(
          (code && KIT_ERRORS[code]) || "We couldn’t start the camera. Try again, or choose a photo.",
        );
        closeKit();
      });
      on("unsupportedResolution", () => {
        setCameraError(KIT_ERRORS.error_resolution_unsupported);
        closeKit();
      });
      on<KitCaptured>("faceDetectionCaptured", async (result) => {
        const first = result.images?.[0];
        if (!first) return;
        try {
          const blob =
            typeof first.image === "string"
              ? await fetch(first.image).then((r) => r.blob())
              : first.image;
          setPreviewUrl(URL.createObjectURL(blob));
          setFileName("camera-capture.jpg");
          setCameraError("");
          setPhase("idle");
        } catch {
          setCameraError("Could not read the captured image. Please try again.");
        } finally {
          closeKit();
        }
      });
    },
    [closeKit],
  );

  const startCamera = useCallback(async () => {
    setCameraError("");
    setKitState("loading");
    try {
      const YMK = await loadKit();
      registerListeners(YMK);

      // The kit renders into <div id="YMK-module"> and wants explicit pixel sizes (300–1920).
      const box = frameRef.current;
      const clamp = (n: number) => Math.min(1920, Math.max(300, Math.round(n)));

      YMK.init({
        faceDetectionMode: KIT_MODE,
        imageFormat: "blob",
        language: "enu",
        qualityLevel: KIT_QUALITY_LEVEL,
        videoQuality: KIT_VIDEO_QUALITY,
        hideFlipCameraButton: true,
        ...(box ? { width: clamp(box.clientWidth), height: clamp(box.clientHeight) } : {}),
      });
      setPreviewUrl("");
      setFileName("");
      setPhase("idle");
      YMK.openCameraKit();
    } catch (error) {
      setKitState("closed");
      setCameraError(
        error instanceof Error ? error.message : "Could not access the camera.",
      );
    }
  }, [registerListeners]);

  // Stop the camera and detach listeners when leaving the page.
  useEffect(() => {
    return () => {
      const YMK = window.YMK;
      if (!YMK) return;
      listenerIds.current.forEach((id) => YMK.removeEventListener(id));
      listenerIds.current = [];
      try {
        YMK.close();
      } catch {
        /* not open */
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* ----- Photo upload ----- */

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setCameraError("Please select a valid image file.");
        return;
      }
      setCameraError("");
      setPhase("idle");
      closeKit();
      setFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [closeKit],
  );

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      acceptFile(event.target.files?.[0]);
      event.target.value = ""; // allow picking the same file again
    },
    [acceptFile],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(false);
      if (!busy) acceptFile(event.dataTransfer.files?.[0]);
    },
    [acceptFile, busy],
  );

  /* ----- Reset / mode / submit ----- */

  /** Clears the current image / camera and returns to the empty stage. */
  const reset = useCallback(() => {
    closeKit();
    setPhase("idle");
    setPreviewUrl("");
    setFileName("");
    setCameraError("");
  }, [closeKit]);

  const retake = useCallback(() => {
    reset();
    if (mode === "camera") void startCamera();
  }, [mode, reset, startCamera]);

  const changeMode = useCallback(
    (next: Mode) => {
      if (next === mode || busy) return;
      reset();
      setMode(next);
    },
    [busy, mode, reset],
  );

  const submit: React.SubmitEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      if (!previewUrl || !fileName || phase !== "idle") return;

      setPhase("sending");
      try {
        const blob = await fetch(previewUrl).then((r) => r.blob());
        await requestScan(blob);
        setPhase("sent");
        toast.success("Image sent. We’ll notify you when your results are ready.");
      } catch (error) {
        console.error("Scan failed:", error);
        setPhase("idle");
        toast.error("Couldn’t send your image. Please try again.");
      }
    },
    [fileName, phase, previewUrl],
  );

  const statusText = kitState === "loading"
    ? "Starting camera…"
    : kitState === "open"
      ? qualityMessage(quality)
      : phase === "sending"
        ? "Sending your image…"
        : phase === "sent"
          ? "Sent for processing"
          : previewUrl
            ? "Image ready to send"
            : mode === "camera"
              ? "Camera is off"
              : "Waiting for a photo";

  // Where the user is in the capture -> send -> notify flow.
  const flowStep = phase === "sent" ? 2 : phase === "sending" ? 1 : 0;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content scan-page"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <PageHeading
            eyebrow="A calm moment for you"
            title="Skin scan"
            description="Take or upload a clear photo. We’ll process it and let you know when it’s done."
          />
        </motion.div>

        <div className="st-layout">
          {/* ---------- Capture stage (primary) ---------- */}
          <motion.form className="panel st-stage" onSubmit={submit} variants={item}>
            <div className="st-stage-top">
              <div className="st-modes" role="tablist" aria-label="Image source">
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    disabled={busy}
                    className={`st-mode ${mode === id ? "selected" : ""}`}
                    onClick={() => changeMode(id)}
                  >
                    {mode === id && (
                      <motion.span
                        layoutId="scan-mode-pill"
                        className="st-mode-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="st-mode-label">
                      <Icon size={14} /> {label}
                    </span>
                  </button>
                ))}
              </div>

              <span className="st-chip" role="status">
                <span
                  className={`status-dot ${isReady || phase === "sent" ? "" : "muted"}`}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusText}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {statusText}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>

            <div ref={frameRef} className={`st-frame ${isReady ? "ready" : ""}`}>
              <AnimatePresence initial={false}>
                {previewUrl ? (
                  <motion.div key="preview" className="st-layer" {...layer}>
                    <img
                      src={previewUrl}
                      alt="Selected scan"
                      className={phase === "sent" ? "dim" : ""}
                    />
                    {phase === "sending" && (
                      <motion.span
                        className="st-sweep"
                        aria-hidden="true"
                        initial={{ top: "0%" }}
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{
                          duration: 2.2,
                          ease: "easeInOut",
                          repeat: Infinity,
                        }}
                      />
                    )}
                    {phase === "sent" && (
                      <motion.div
                        className="st-sent-badge"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      >
                        <Check size={26} />
                      </motion.div>
                    )}
                  </motion.div>
                ) : mode === "upload" ? (
                  <motion.div key="drop" className="st-layer" {...layer}>
                    <label
                      className={`st-drop ${dragging ? "dragging" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                    >
                      <span className="st-drop-icon">
                        <ImagePlus size={22} />
                      </span>
                      <strong>Drop a photo here</strong>
                      <small>or click to choose one from your device</small>
                      <input type="file" accept="image/*" onChange={handleFile} />
                    </label>
                  </motion.div>
                ) : kitState === "loading" ? (
                  <motion.div key="loading" className="st-layer" {...layer}>
                    <Loader2 size={28} className="spin st-loader" />
                  </motion.div>
                ) : !kitActive ? (
                  <motion.div key="guide" className="st-layer" {...layer}>
                    <motion.div
                      className="face-guide"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
                    >
                      <span className="guide-corner top-left" />
                      <span className="guide-corner top-right" />
                      <span className="guide-corner bottom-left" />
                      <span className="guide-corner bottom-right" />
                      <div className="face-shape">
                        <span className="face-eye left" />
                        <span className="face-eye right" />
                        <span className="face-smile" />
                      </div>
                    </motion.div>
                    <button
                      className="button button-primary st-cta"
                      type="button"
                      onClick={startCamera}
                    >
                      <Camera size={16} /> Start camera
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/*
                Mandatory mount point for the Camera Kit UI. It stays mounted (React never renders
                children into it) so the SDK can find it, and only captures pointer events while open.
              */}
              <div
                id="YMK-module"
                className={`st-kit ${kitState === "open" ? "open" : ""}`}
              />
            </div>

            <AnimatePresence>
              {cameraError && (
                <motion.p
                  key="error"
                  role="alert"
                  className="st-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {cameraError}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="st-actions">
              <AnimatePresence mode="popLayout" initial={false}>
                {kitActive ? (
                  <motion.div key="live" className="st-actions-row" {...layer}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={reset}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </motion.div>
                ) : previewUrl && phase !== "sent" ? (
                  <motion.div key="review" className="st-actions-row" {...layer}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={retake}
                      disabled={busy}
                    >
                      <RotateCcw size={16} />
                      {mode === "camera" ? "Retake" : "Choose another"}
                    </button>
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          Sending <Loader2 size={16} className="spin" />
                        </>
                      ) : (
                        <>
                          Send image <Send size={16} />
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : phase === "sent" ? (
                  <motion.div key="sent" className="st-sent" {...layer}>
                    <p>
                      <strong>Your image is on its way.</strong>
                      <small>
                        We’ll notify you when your results are ready. You can
                        leave this page.
                      </small>
                    </p>
                    <div className="st-sent-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={reset}
                      >
                        Scan another
                      </button>
                      <Link className="quiet-link" to="/progress">
                        View my progress <ArrowRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p key="hint" className="st-hint" {...layer}>
                    {mode === "camera"
                      ? "Start the camera. It captures automatically once your face is in position."
                      : "A clear, well-lit photo gives the best analysis."}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.form>

          {/* ---------- Side column ---------- */}
          <div className="st-side">
            <motion.section className="panel st-flow" variants={item}>
              <p className="page-eyebrow">How it works</p>
              <ol>
                {FLOW.map(({ icon: Icon, title }, index) => {
                  const done = index < flowStep;
                  const active = index === flowStep;
                  return (
                    <li
                      key={title}
                      className={done ? "done" : active ? "active" : ""}
                    >
                      <motion.span
                        className="st-flow-icon"
                        animate={{ scale: active ? 1.08 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {done ? <Check size={15} /> : <Icon size={15} />}
                      </motion.span>
                      <span>{title}</span>
                    </li>
                  );
                })}
              </ol>
            </motion.section>

            <motion.section className="panel st-tips" variants={item}>
              <p className="page-eyebrow">Before you begin</p>
              <motion.ul variants={container}>
                {TIPS.map(({ icon: Icon, title, text }) => (
                  <motion.li
                    key={title}
                    variants={item}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    <span className="st-tip-icon">
                      <Icon size={16} />
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.section>

            <motion.div className="privacy-note" variants={item}>
              <ShieldCheck size={17} />
              <span>
                <strong>Your image stays yours.</strong>
                <small>
                  Your photo is only used for this scan and is not stored or
                  shared.
                </small>
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}