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
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import PageHeading from "../components/PageHeading";
import toast from "react-hot-toast";
import { requestScan } from "../services/scan";
import { useCameraKit } from "../hooks/useCameraKit";

export default function Scan() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Set when the preview URL has been handed to the next page.
  const keepPreviewUrlRef = useRef(false);

  const navigate = useNavigate();

  const handleCaptured = useCallback((blob: Blob) => {
    setUploadError("");
    setPreviewUrl(URL.createObjectURL(blob));
    setFileName("camera-capture.jpg");
  }, []);

  const camera = useCameraKit(handleCaptured);
  const cameraError = camera.error || uploadError;

  useEffect(() => {
    return () => {
      if (previewUrl && !keepPreviewUrlRef.current) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setUploadError("Please select a valid image file.");
        event.target.value = "";
        return;
      }

      setUploadError("");
      camera.close();

      setFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));

      // Allow the same file to be selected again.
      event.target.value = "";
    },
    [camera],
  );

  const startCamera = useCallback(() => {
    setUploadError("");
    setPreviewUrl("");
    setFileName("");
    void camera.open();
  }, [camera]);

  const continuePreview: React.SubmitEventHandler<HTMLFormElement> =
    useCallback(
      async (event) => {
        event.preventDefault();

        if (!previewUrl || !fileName) return;

        try {
          const blob = await fetch(previewUrl).then((r) => r.blob());
          const scanId = await requestScan(blob);

          keepPreviewUrlRef.current = true;
          navigate(`/scan-result/${scanId}`, {
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
      [fileName, navigate, previewUrl],
    );

  const showGuide = !camera.isOpen && !camera.isLoading && !previewUrl;

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
            {/* Mandatory mount point for the Camera Kit UI. Always rendered. */}
            <div id="YMK-module" />

            {previewUrl && !camera.isOpen && (
              <img src={previewUrl} alt="Selected scan preview" />
            )}

            {showGuide && (
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

          <div className="capture-status">
            <span className={`status-dot ${camera.isReady ? "" : "muted"}`} />
            {camera.isOpen
              ? camera.isLoading
                ? "Starting camera..."
                : camera.status
              : "Start your camera or choose a photo"}
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

            {camera.isOpen ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={camera.close}
              >
                <X size={16} />
                Cancel
              </button>
            ) : (
              <button
                className="button button-secondary"
                type="button"
                onClick={startCamera}
                disabled={camera.isLoading}
              >
                <Camera size={16} />
                {previewUrl ? "Retake photo" : "Start camera"}
              </button>
            )}

            <button
              className="button button-primary"
              type="submit"
              disabled={camera.isOpen || !previewUrl}
            >
              Preview result
              <ArrowRight size={16} />
            </button>
          </div>

          {fileName && !camera.isOpen ? (
            <p className="inline-confirm">
              <Check size={14} />
              Image ready for preview only.
            </p>
          ) : (
            <p className="small-note">
              {camera.isOpen
                ? "Hold still. Your photo is captured automatically."
                : "Make sure your photo is clear and well-lit for the best analysis."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
