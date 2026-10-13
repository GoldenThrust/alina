const SDK_URL = "https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js";

let sdkPromise: Promise<void> | null = null;

/** Loads the SDK once. YMKAsyncInit must be defined before the script runs. */
export function loadCameraKit(): Promise<void> {
  if (window.YMK) return Promise.resolve();

  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      window.YMKAsyncInit = () => resolve();

      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.YMK) resolve();
      };
      script.onerror = () => {
        script.remove();
        sdkPromise = null; // allow retry
        reject(new Error("Failed to load the camera module."));
      };
      document.body.appendChild(script);
    });
  }

  return sdkPromise;
}