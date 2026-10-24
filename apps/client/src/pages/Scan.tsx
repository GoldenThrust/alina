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
import PageHeading from "../components/PageHeading";
import { requestScan } from "../services/scan";
import { useFaceQuality } from "../hooks/useFaceQuality";
import { EASE, container, item } from "../utils/motion";

type Phase = "idle" | "sending" | "sent";
type Mode = "camera" | "upload";

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "camera", label: "Camera", icon: Camera },
  { id: "upload", label: "Photo", icon: Upload },
];

const TIPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sun, title: "Face the light", text: "Soft, even light, no harsh shadows." },
  { icon: Glasses, title: "Keep it natural", text: "No glasses, hair away from your face." },
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const qualityStatus = useFaceQuality(
    videoRef,
    analysisCanvasRef,
    overlayCanvasRef,
    streaming && !!stream,
  );
  const isReady = streaming && qualityStatus.includes("✓");
  const busy = phase === "sending";

  // Attach the stream after the video element renders; stop tracks on change/unmount.
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      void video.play().catch((error: unknown) => {
        console.error("Could not play camera preview:", error);
      });
    }
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopCamera = useCallback(() => {
    setStream(null);
    setStreaming(false);
  }, []);

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setCameraError("Please select a valid image file.");
        return;
      }
      setCameraError("");
      setPhase("idle");
      stopCamera();
      setFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [stopCamera],
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

  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access requires HTTPS or localhost in a supported browser.",
        );
      }
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setPhase("idle");
      setPreviewUrl("");
      setFileName("");
      setStream(mediaStream);
      setStreaming(true);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Could not access the camera.",
      );
    }
  }, [stopCamera]);

  const captureImage = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setCameraError("Wait for the camera preview to load.");
      return;
    }

    // Offscreen canvas: full resolution, never contains the detection overlay.
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not initialize image capture.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Could not capture the image.");
          return;
        }
        setPreviewUrl(URL.createObjectURL(blob));
        setFileName("camera-capture.jpg");
        setCameraError("");
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  }, [stopCamera]);

  /** Clears the current image / camera and returns to the empty stage. */
  const reset = useCallback(() => {
    stopCamera();
    setPhase("idle");
    setPreviewUrl("");
    setFileName("");
    setCameraError("");
  }, [stopCamera]);

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

      if (streaming) {
        captureImage();
        return;
      }
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
    [captureImage, fileName, phase, previewUrl, streaming],
  );

  const statusText = streaming
    ? qualityStatus
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

            <div className={`st-frame ${isReady ? "ready" : ""}`}>
              <AnimatePresence initial={false}>
                {previewUrl ? (
                  <motion.div key="preview" className="st-layer" {...layer}>
                    <img
                      src={previewUrl}
                      alt="Selected scan"
                      className={`max-w-full h-auto ${phase === "sent" ? "dim" : ""}`}
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
                ) : stream ? (
                  <motion.div key="video" className="st-layer" {...layer}>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <canvas ref={overlayCanvasRef} className="face-overlay" />
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
                ) : (
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
                )}
              </AnimatePresence>
            </div>

            {/* Small hidden canvas used only for brightness/blur analysis */}
            <canvas ref={analysisCanvasRef} hidden />

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
                {streaming ? (
                  <motion.div key="live" className="st-actions-row" {...layer}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={reset}
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={!isReady}
                    >
                      Capture <Camera size={16} />
                    </button>
                  </motion.div>
                ) : previewUrl && phase !== "sent" ? (
                  <motion.div key="review" className="st-actions-row" {...layer}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={reset}
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
                      ? "Start the camera, then capture when the guide turns green."
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