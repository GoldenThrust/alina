/* ---------- Dummy preferences (remove once the API is wired up) ---------- */

export const MOCK_PREFERENCES: Preference = {
  id: "preference-1",
  userId: "user-1",
  favoriteBrands: ["Dermacalm", "Aqualume"],
  favoriteIngredients: ["Niacinamide", "Hyaluronic acid", "Ceramides"],
  avoidedIngredients: ["Fragrance", "Alcohol denat."],
  budget: 40,
};

// Stands in for the database so saves survive a reload within the session
let serverCopy: Preference = structuredClone(MOCK_PREFERENCES);

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/* ---------- "Backend" ---------- */

export async function fetchPreferences(options: { signal?: AbortSignal } = {}): Promise<Preference> {
  // Swap this body for the real request:
  //   const res = await fetch("/api/preferences", { signal: options.signal });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   return (await res.json()) as Preference;
  await wait(500, options.signal);
  return structuredClone(serverCopy);
}

export async function savePreferences(
  preferences: Preference,
  options: { signal?: AbortSignal } = {},
): Promise<Preference> {
  // Swap this body for the real request:
  //   const res = await fetch("/api/preferences", {
  //     method: "PUT",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(preferences),
  //     signal: options.signal,
  //   });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   return (await res.json()) as Preference;
  await wait(600, options.signal);
  serverCopy = structuredClone(preferences);
  return structuredClone(serverCopy);
}