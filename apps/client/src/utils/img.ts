const FALLBACK = "/images/fallback.png";

document.addEventListener(
  "error",
  (e: any) => {
    if (e?.target?.tagName === "IMG") {
      e.target.onerror = null; // prevent infinite loop
      e.target.src = FALLBACK;
    }
  },
  true
);