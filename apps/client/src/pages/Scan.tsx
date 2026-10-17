import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowRight,
  Check,
  ImagePlus,
  ScanFace,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { useNavigate } from "react-router";
import PageHeading from "../components/PageHeading";
import toast from "react-hot-toast";
import { requestScan } from "../services/scan";
import { useFaceQuality } from "../hooks/useFaceQuality";

export default function Scan() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Set when the preview URL has been handed to the next page.
  const keepPreviewUrlRef = useRef(false);

  const qualityStatus = useFaceQuality(
    videoRef,
    analysisCanvasRef,
    overlayCanvasRef,
    streaming && !!stream,
  );
  const isReady = qualityStatus.includes("✓");

  const navigate = useNavigate();

  // Attach the stream after React renders the video element.
  // Stop the camera when the stream changes or the component unmounts.
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

      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  // Release object URLs when replaced, but not when we've handed the URL
  // to the result page (it still needs it).
  useEffect(() => {
    return () => {
      if (previewUrl && !keepPreviewUrlRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCameraError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setCameraError("");
    setStream(null);
    setStreaming(false);

    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));

    // Allow the same file to be selected again.
    event.target.value = "";
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access requires HTTPS or localhost in a supported browser.",
        );
      }

      // Release any previous camera stream before opening another.
      setStream(null);
      setStreaming(false);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      setPreviewUrl("");
      setFileName("");
      setStream(mediaStream);
      setStreaming(true);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Could not access the camera.",
      );
    }
  }, []);

  const captureImage = useCallback(() => {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setCameraError("Wait for the camera preview to load.");
      return;
    }

    // Use an offscreen canvas so the capture is full-resolution and never
    // contains the face-detection overlay.
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

        // Clearing the stream triggers the cleanup effect,
        // which stops the camera tracks.
        setStream(null);
        setStreaming(false);
      },
      "image/jpeg",
      0.9,
    );
  }, []);

  const continuePreview: React.SubmitEventHandler<HTMLFormElement> =
    useCallback(
      async (event) => {
        event.preventDefault();

        if (streaming) {
          captureImage();
          return;
        }

        if (!previewUrl || !fileName) return;

        try {
          const blob = await fetch(previewUrl).then((r) => r.blob());
          const scanId = await requestScan(blob);

          keepPreviewUrlRef.current = true;
          navigate("/scan-result", {
            state: {
              scanId,
              fileName,
              previewUrl,
              previewOnly: true,
            },
          });
          toast.success("Analysis complete! You can view your scan result.");
        } catch (error) {
          console.error("Scan failed:", error);
          toast.error("Failed to complete the scan.");
        }
      },
      [captureImage, fileName, navigate, previewUrl, streaming],
    );

  return (
    <div className="page-content scan-page">
      <PageHeading
        eyebrow="A calm moment for you"
        title="Skin scan"
        description="Find soft, even light and bring your face into the guide."
      />

      <div className="scan-layout">
        <section className="panel scan-instructions">
          <div className="section-kicker">
            <ScanFace size={15} /> BEFORE YOU BEGIN
          </div>

          <h2>Let's get a clear starting point.</h2>

          <p className="muted-copy">
            A few small things can help make a future scan more consistent.
          </p>

          <ol className="scan-steps">
            <li>
              <span>01</span>
              <div>
                <strong>Face the light</strong>
                <small>Choose soft, even light and avoid strong shadows.</small>
              </div>
            </li>

            <li>
              <span>02</span>
              <div>
                <strong>Keep it natural</strong>
                <small>Remove glasses and move hair away from your face.</small>
              </div>
            </li>

            <li>
              <span>03</span>
              <div>
                <strong>Stay centered</strong>
                <small>
                  Look toward the camera and keep your face inside the frame.
                </small>
              </div>
            </li>
          </ol>

          <div className="privacy-note">
            <ShieldCheck size={17} />
            <span>
              <strong>Your image stays yours.</strong>
              <small>
                Your photo is only used for this scan and is not stored or
                shared.
              </small>
            </span>
          </div>
        </section>

        <form className="panel capture-panel" onSubmit={continuePreview}>
          <div className="capture-frame">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected scan preview" />
            ) : stream ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={overlayCanvasRef} className="face-overlay" />
              </>
            ) : (
              <div className="face-guide">
                <span className="guide-corner top-left" />
                <span className="guide-corner top-right" />
                <span className="guide-corner bottom-left" />
                <span className="guide-corner bottom-right" />

                <div className="face-shape">
                  <span className="face-eye left" />
                  <span className="face-eye right" />
                  <span className="face-smile" />
                </div>

                <span className="frame-hint">CENTER YOUR FACE</span>
              </div>
            )}
          </div>

          {/* Small hidden canvas used only for brightness/blur analysis */}
          <canvas ref={analysisCanvasRef} hidden />

          <div className="capture-status">
            <span className={`status-dot ${isReady ? "" : "muted"}`} />
            {streaming ? qualityStatus : "Start your camera or choose a photo"}
          </div>

          {cameraError && (
            <p role="alert" className="small-note">
              {cameraError}
            </p>
          )}

          <div className="capture-actions">
            <label className="button button-secondary upload-button">
              <ImagePlus size={16} />
              Choose a photo
              <input type="file" accept="image/*" onChange={handleFile} />
            </label>

            {!streaming && (
              <button
                className="button button-secondary"
                type="button"
                onClick={startCamera}
              >
                <Camera size={16} />
                {previewUrl ? "Retake photo" : "Start camera"}
              </button>
            )}

            <button
              className="button button-primary"
              type="submit"
              disabled={streaming ? !isReady : !previewUrl}
            >
              {streaming ? (
                <>
                  Capture
                  <Camera size={16} />
                </>
              ) : (
                <>
                  Preview result
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {fileName && !streaming ? (
            <p className="inline-confirm">
              <Check size={14} />
              Image ready for preview only.
            </p>
          ) : (
            <p className="small-note">
              {streaming
                ? "Capture a frame when you're ready."
                : "Make sure your photo is clear and well-lit for the best analysis."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
