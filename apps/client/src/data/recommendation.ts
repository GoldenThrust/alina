/* ---------- Dummy recommendations (remove once the API is wired up) ---------- */

import { MOCK_SCANS } from "./skinProgress";


type RecommendationSeed = Pick<Recommendation, "type" | "explanation"> & {
  productId?: string;
  routineId?: string;
};

const RECOMMENDATION_SEEDS: RecommendationSeed[] = [
  {
    type: "PRODUCT",
    productId: "product-1",
    explanation:
      "Your moisture score has been trending low. A hyaluronic acid serum can help restore hydration.",
  },
  {
    type: "PRODUCT",
    productId: "product-2",
    explanation:
      "Mild redness detected. A fragrance-free barrier cream with ceramides can calm and protect your skin.",
  },
  {
    type: "PRODUCT",
    productId: "product-3",
    explanation:
      "Your T-zone shows excess oiliness. A lightweight niacinamide moisturizer can help balance sebum.",
  },
  {
    type: "PRODUCT",
    productId: "product-4",
    explanation:
      "Radiance has room to improve. A daily vitamin C serum can brighten and even out your tone.",
  },
  {
    type: "PRODUCT",
    productId: "product-7",
    explanation:
      "Age spots are slightly elevated. A daily broad-spectrum SPF 50 will help prevent them from deepening.",
  },
  {
    type: "PRODUCT",
    productId: "product-8",
    explanation:
      "Fine lines around the forehead and eyes can be targeted with a gentle retinol in your evening routine.",
  },
  {
    type: "PRODUCT",
    productId: "product-9",
    explanation:
      "Pores on your nose and cheeks look more visible. A BHA exfoliant used 2-3 times a week can help.",
  },
  {
    type: "PRODUCT",
    productId: "product-10",
    explanation:
      "Dark circles and eye bags are slightly elevated. A cooling under-eye roller can reduce puffiness in the morning.",
  },
  {
    type: "ROUTINE",
    routineId: "routine-1",
    explanation:
      "A simple morning routine (cleanse, serum, moisturizer, SPF) will support hydration and protect against age spots.",
  },
  {
    type: "ROUTINE",
    routineId: "routine-2",
    explanation:
      "An evening routine with a gentle retinoid twice a week can target fine lines around the eyes and forehead.",
  },
  {
    type: "ROUTINE",
    routineId: "routine-3",
    explanation:
      "Add a weekly exfoliating step to refine texture and minimize the look of pores on your nose and cheeks.",
  },
  {
    type: "HABIT",
    explanation:
      "Aim for 7-8 hours of sleep. It can noticeably reduce dark circles and eye bags.",
  },
  {
    type: "HABIT",
    explanation:
      "Drinking more water throughout the day can support your moisture and firmness scores.",
  },
  {
    type: "HABIT",
    explanation:
      "Reapply SPF every two hours when outdoors to prevent age spots from deepening.",
  },
];

export const MOCK_RECOMMENDATIONS: Recommendation[] = MOCK_SCANS.slice(0, 30).flatMap(
  (scan, i) => {
    // Deterministically give each scan 1-3 recommendations
    const count = 1 + (i % 3);

    return Array.from({ length: count }, (_, j) => {
      const seed =
        RECOMMENDATION_SEEDS[(i * 3 + j) % RECOMMENDATION_SEEDS.length];

      return {
        id: `recommendation-${i + 1}-${j + 1}`,
        userId: scan.userId,
        scanId: scan.id,
        type: seed.type,
        explanation: seed.explanation,
        accepted: (i + j) % 3 === 0,
        productId: seed.productId ?? null,
        routineId: seed.routineId ?? null,
        // Slightly after the scan it belongs to
        createdAt: new Date(scan.createdAt.getTime() + (j + 1) * 60_000),
      } satisfies Recommendation;
    });
  },
);

// A couple of general recommendations not tied to any scan
MOCK_RECOMMENDATIONS.push(
  {
    id: "recommendation-general-1",
    userId: "user-1",
    scanId: null,
    type: "HABIT",
    explanation:
      "Consistency matters most: scan weekly under similar lighting to get the most accurate trend data.",
    accepted: false,
    productId: null,
    routineId: null,
    createdAt: new Date(),
  },
  {
    id: "recommendation-general-2",
    userId: "user-1",
    scanId: null,
    type: "ROUTINE",
    routineId: "routine-1",
    explanation:
      "Based on your overall progress, we suggest keeping your current morning routine.",
    accepted: true,
    productId: null,
    createdAt: new Date(),
  },
);

/* ---------- "Backend" ---------- */

export async function fetchRecommendations(
  options: { scanId?: string; signal?: AbortSignal } = {},
): Promise<Recommendation[]> {
  const { scanId, signal } = options;

  // Swap this body for the real request:
  //   const qs = scanId ? `?scanId=${encodeURIComponent(scanId)}` : "";
  //   const res = await fetch(`/api/recommendations${qs}`, { signal });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   return (await res.json()) as Recommendation[];
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, 600);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  return scanId
    ? MOCK_RECOMMENDATIONS.filter((r) => r.scanId === scanId)
    : MOCK_RECOMMENDATIONS;
}