
type View = "overview" | "pores" | "wrinkles";
type Axis = { label: string; pick: (a: SkinAnalysis) => number | null | undefined, key:  keyof SkinAnalysis | `${keyof SkinAnalysis}.${keyof PoreScores}` | `${keyof SkinAnalysis}.${keyof WrinkleScores}` };
type ChartRow = {
  label: string;
  fullLabel: string;
  [series: string]: number | string | null;
};