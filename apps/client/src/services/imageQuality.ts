export function brightness(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !canvas.width || !canvas.height) return 0;

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return total / (data.length / 4);
}

/** Variance of the Laplacian on grayscale. Higher = sharper. */
export function blurScore(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  if (!ctx || w < 3 || h < 3) return 0;

  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let n = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }

  const mean = sum / n;
  return sumSq / n - mean * mean;
}