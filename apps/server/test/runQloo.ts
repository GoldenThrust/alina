import "dotenv/config";
import process from "process";
import fs from "fs";

const BASE = process.env.QLOO_API_URL ?? "https://hackathon.api.qloo.com";
const TIMEOUT_MS = 8_000;

const TTL_OK_S = 6 * 60 * 60; // 6h
const TTL_EMPTY_S = 10 * 60; // 10m: retry sooner when Qloo found nothing
const CACHE_VERSION = "v1"; // bump when params or response shape change

// VERIFY against the hackathon guide: these are the only Qloo-specific strings.
const SEARCH_PATH = "/search";
const INSIGHTS_PATH = "/v2/insights";
const BRAND_TYPE = "urn:entity:brand";
const TAG_TYPE = "urn:tag";
const SEED_PARAM = "signal.interests.entities";
const AGE_PARAM = "signal.demographics.age";
const GENDER_PARAM = "signal.demographics.gender";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgeBand = "35_and_younger" | "36_to_55" | "55_and_older";

export interface TasteContext {
  ageBand?: AgeBand;
  gender?: "male" | "female";
  /** "Lagos, Nigeria". Part of the cache key; not applied to brand queries. */
  location?: string;
}

export interface TasteInsights {
  brands: string[];
  tags: string[];
}

export class QlooError extends Error {}

async function get(path: string, params: Record<string, string>) {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new QlooError("missing_api_key");

  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "X-Api-Key": key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new QlooError(`qloo_${res.status}`);
  return res.json();
}

get("/search", {
  query: "I am looking for a skincare brand that is vegan and cruelty-free",
  types: "urn:entity:brand",
  limit: "5",
})
  .then((data) => {
    fs.writeFileSync("qloo_search_result.json", JSON.stringify(data, null, 2));
    console.log("Qloo search result:", data)})
  .catch((err) => console.error("Qloo search error:", err));
