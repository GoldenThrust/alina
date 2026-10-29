import {
  Sparkles,
  Droplets,
  Waves,
  Sun,
  HeartPulse,
  Grid2x2,
  CircleDot,
  Moon,
  Eye,
  ShieldCheck,
  CircleDashed,
  ScanFace,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { percentageChange } from "./math";

export const analysisMeta: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    color: string;
  }
> = {
  acne: { icon: Sparkles, color: "rose", label: "Acne" },
  moisture: { icon: Droplets, color: "blue", label: "Hydration" },
  oiliness: { icon: Waves, color: "amber", label: "Oil Balance" },
  radiance: { icon: Sun, color: "yellow", label: "Radiance" },
  redness: { icon: HeartPulse, color: "red", label: "Redness" },
  texture: { icon: Grid2x2, color: "slate", label: "Texture" },
  ageSpot: { icon: CircleDot, color: "brown", label: "Age Spots" },
  darkCircle: { icon: Moon, color: "indigo", label: "Dark Circles" },
  eyeBag: { icon: Eye, color: "cyan", label: "Eye Bags" },
  droopyUpperEyelid: { icon: Eye, color: "violet", label: "Upper Eyelid" },
  droopyLowerEyelid: { icon: Eye, color: "violet", label: "Lower Eyelid" },
  firmness: { icon: ShieldCheck, color: "emerald", label: "Firmness" },
  tearTrough: { icon: Smile, color: "sky", label: "Tear Trough" },

  pore: {
    icon: CircleDashed,
    color: "teal",
    label: "Pores",
  },

  wrinkle: {
    icon: ScanFace,
    color: "violet",
    label: "Wrinkles",
  },
};

type TrendDirection = "higher" | "lower";

/**
 * higher = higher value is better (moisture, firmness, radiance)
 * lower = lower value is better (acne, wrinkles, pores, redness)
 */
export function getAnalysisNote(
  percentage: number,
  direction: TrendDirection,
): string {
  const improvement =
    direction === "higher" ? percentage : -percentage;

  const abs = Math.abs(improvement);

  if (abs < 1) return "Similar to last check";
  if (abs < 3) return improvement > 0 ? "Slight improvement" : "Minor setback";
  if (abs < 7) return improvement > 0 ? "More balanced" : "Slightly less balanced";
  if (abs < 12) return improvement > 0 ? "Noticeable improvement" : "Needs attention";
  if (abs < 20) return improvement > 0 ? "Looking much healthier" : "Showing visible changes";

  return improvement > 0
    ? "Excellent progress"
    : "Significant change detected";
}

type SortedAnalysisDelta = {
  key: string;
  value: number;
};


export function sortAnalysisChange(
  delta: SkinScan,
): SortedAnalysisDelta[] {
  if (!delta) return [];

  const analysis = delta.analysis as SkinAnalysis;
  const result: SortedAnalysisDelta[] = [];

  for (const [key, value] of Object.entries(analysis)) {
    if (typeof value === "number") {
      result.push({ key, value });
      continue;
    }

    if (value && typeof value === "object") {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (typeof subValue === "number") {
          result.push({
            key: `${key}.${subKey}`,
            value: subValue,
          });
        }
      }
    }
  }

  return result.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function calculateAnalysisDelta(
  latestAnalysis: SkinScan["analysis"],
  previousAnalysis: SkinScan["analysis"],
): SkinAnalysis {
  return {
    acne: latestAnalysis?.acne! - previousAnalysis?.acne!,
    moisture: latestAnalysis?.moisture! - previousAnalysis?.moisture!,
    oiliness: latestAnalysis?.oiliness! - previousAnalysis?.oiliness!,
    radiance: latestAnalysis?.radiance! - previousAnalysis?.radiance!,
    redness: latestAnalysis?.redness! - previousAnalysis?.redness!,
    texture:
      latestAnalysis?.texture! -
      previousAnalysis?.texture!,
    ageSpot: latestAnalysis?.ageSpot! - previousAnalysis?.ageSpot!,
    darkCircle:
      latestAnalysis?.darkCircle! - previousAnalysis?.darkCircle!,
    eyeBag: latestAnalysis?.eyeBag! - previousAnalysis?.eyeBag!,
    droopyUpperEyelid:
      latestAnalysis?.droopyUpperEyelid! -
      previousAnalysis?.droopyUpperEyelid!,
    droopyLowerEyelid:
      latestAnalysis?.droopyLowerEyelid! -
      previousAnalysis?.droopyLowerEyelid!,
    firmness: latestAnalysis?.firmness! - previousAnalysis?.firmness!,
    pore: {
      forehead:
        latestAnalysis?.pore!.forehead! -
        previousAnalysis?.pore!.forehead!,
      nose:
        latestAnalysis?.pore!.nose! -
        previousAnalysis?.pore!.nose!,
      cheek:
        latestAnalysis?.pore!.cheek! -
        previousAnalysis?.pore!.cheek!,
      whole:
        latestAnalysis?.pore!.whole! -
        previousAnalysis?.pore!.whole!,
    },
    wrinkle: {
      forehead:
        latestAnalysis?.wrinkle!.forehead! -
        previousAnalysis?.wrinkle!.forehead!,
      glabellar:
        latestAnalysis?.wrinkle!.glabellar! -
        previousAnalysis?.wrinkle!.glabellar!,
      crowfeet:
        latestAnalysis?.wrinkle!.crowfeet! -
        previousAnalysis?.wrinkle!.crowfeet!,
      periocular:
        latestAnalysis?.wrinkle!.periocular! -
        previousAnalysis?.wrinkle!.periocular!,
      nasolabial:
        latestAnalysis?.wrinkle!.nasolabial! -
        previousAnalysis?.wrinkle!.nasolabial!,
      marionette:
        latestAnalysis?.wrinkle!.marionette! -
        previousAnalysis?.wrinkle!.marionette!,
      whole:
        latestAnalysis?.wrinkle!.whole! -
        previousAnalysis?.wrinkle!.whole!,
    },
    tearTrough:
      latestAnalysis?.tearTrough! -
      previousAnalysis?.tearTrough!,
  };
}

type MapNumbers<T> = {
  [K in keyof T]: T[K] extends number
    ? number
    : T[K] extends object
      ? MapNumbers<T[K]>
      : T[K];
};

export function mapNestedNumbers<T>(
  obj: T,
  mapper: (value: number, path: string) => number,
  path = "",
): MapNumbers<T> {
  if (typeof obj !== "object" || obj === null) {
    return obj as MapNumbers<T>;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "number") {
      result[key] = mapper(value, currentPath);
    } else {
      result[key] = mapNestedNumbers(
        value,
        mapper,
        currentPath,
      );
    }
  }

  return result as MapNumbers<T>;
}

/**
 * Gets a nested value using dot notation.
 * Example:
 * getNestedValue(obj, "pore.nose")
 */
export function getNestedValue(
  obj: SkinAnalysis,
  path: string,
): number {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }

      return undefined;
    }, obj);

  return typeof value === "number" ? value : 0;
}

export function calculateAnalysisDeltaPercent(
  latest: SkinScan["analysis"],
  previous: SkinScan["analysis"],
) {
  const delta = calculateAnalysisDelta(latest, previous);

  return mapNestedNumbers<SkinAnalysis>(
    delta,
    (_, path) => {
      const latestValue = getNestedValue(
        latest as SkinAnalysis,
        path,
      );

      const previousValue = getNestedValue(
        previous as SkinAnalysis,
        path,
      );

      return percentageChange(
        latestValue,
        previousValue,
      );
    },
  );
}