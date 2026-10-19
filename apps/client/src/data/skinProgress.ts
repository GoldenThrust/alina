/* ---------- Dummy data (remove once the API is wired up) ---------- */

const DATES = [];

for (let i = 0; i < 300; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i * 3 * Math.sin(Math.PI * Math.random()));
  DATES.push(date.toISOString());
}

type Trend = [from: number, to: number, phase: number];

// Deterministic drift from `from` to `to` with a small wobble, clamped to 0-100
const pt = ([from, to, phase]: Trend, i: number, n: number) => {
  const t = n > 1 ? i / (n - 1) : 1;
  const v = from + (to - from) * t + 2.5 * Math.sin(i * phase + phase);
  return Math.round(Math.max(0, Math.min(100, v)));
};

function buildAnalysis(i: number, n: number): SkinAnalysis {
  return {
    id: `analysis-${i + 1}`,
    scanId: `scan-${i + 1}`,
    redness: pt([62, 78, 1.1], i, n),
    ageSpot: pt([62, 70, 0.9], i, n),
    radiance: pt([62, 83, 0.8], i, n),
    moisture: pt([42, 80, 0.5], i, n),
    oiliness: pt([52, 64, 1.3], i, n),
    darkCircle: pt([52, 60, 1.7], i, n),
    eyeBag: pt([60, 67, 1.2], i, n),
    droopyUpperEyelid: pt([75, 79, 0.6], i, n),
    droopyLowerEyelid: pt([78, 83, 0.7], i, n),
    firmness: pt([66, 73, 1.4], i, n),
    texture: pt([68, 70, 0.3], i, n),
    acne: pt([72, 86, 1.0], i, n),
    pore: {
      forehead: pt([62, 70, 1.5], i, n),
      nose: pt([48, 56, 1.1], i, n),
      cheek: pt([57, 65, 0.9], i, n),
      whole: pt([55, 64, 1.2], i, n),
    },
    wrinkle: {
      forehead: pt([73, 79, 0.8], i, n),
      glabellar: pt([68, 75, 1.0], i, n),
      crowfeet: pt([63, 70, 1.3], i, n),
      periocular: pt([66, 73, 0.9], i, n),
      nasolabial: pt([61, 67, 1.6], i, n),
      marionette: pt([69, 76, 0.7], i, n),
      whole: pt([66, 73, 1.1], i, n),
    },
    tearTrough: pt([55, 62, 1.4], i, n),
    skinType: { whole: "combination", t_zone: "oily", u_zone: "normal" },
  };
}

export const MOCK_SCANS: SkinScan[] = DATES.map((date, i) => ({
  id: `scan-${i + 1}`,
  aiObservation: `AI observation for scan ${i + 1}`,
  aiShortObservation: `AI short observation for scan ${i + 1}`,
  aiSummary: `AI summary for scan ${i + 1}`,
  aiShortSummary: `AI short summary for scan ${i + 1}`,
  userId: "user-1",
  status: "COMPLETED",
  image: `https://picsum.photos/seed/${i + 1}/400/400`,
  createdAt: new Date(date),
  score: pt([30, 82, 0.7], i, DATES.length),
  skinAge: pt([30, 82, 0.7], i, DATES.length),
  analysis: buildAnalysis(i, DATES.length),
}));

/* ---------- "Backend" ---------- */

export async function fetchSkinScans(signal?: AbortSignal): Promise<SkinScan[]> {
  // Swap this body for the real request:
  //   const res = await fetch("/api/skin-scans", { signal });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   return (await res.json()) as SkinScan[];
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, 600);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  return MOCK_SCANS;
}