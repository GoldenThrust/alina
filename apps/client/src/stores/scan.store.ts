import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { newestFirst, oldestFirst } from "../utils/dates.store";
import {
  emptyEntities,
  patchOne,
  removeOne,
  selectAll,
  setAll,
  upsertMany,
  upsertOne,
} from "../utils/entities.store";
import {
  calculateAnalysisDelta,
  calculateAnalysisDeltaPercent,
  sortAnalysisChange,
} from "../utils/analysis";
import { percentageChange } from "../utils/math";

interface ScanState {
  scans: Entities<SkinScan>;
  /** Scan the user is currently viewing. */
  selectedScanId: string | null;

  setScans: (scans: SkinScan[]) => void;
  upsertScan: (scan: SkinScan) => void;
  upsertScans: (scans: SkinScan[]) => void;
  setAnalysis: (scanId: string, analysis: SkinAnalysis) => void;
  setStatus: (scanId: string, status: ScanStatus) => void;
  removeScan: (scanId: string) => void;
  selectScan: (scanId: string | null) => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  scans: emptyEntities(),
  selectedScanId: null,

  setScans: (scans) => set({ scans: setAll(scans) }),
  upsertScan: (scan) => set((s) => ({ scans: upsertOne(s.scans, scan) })),
  upsertScans: (scans) => set((s) => ({ scans: upsertMany(s.scans, scans) })),
  setAnalysis: (scanId, analysis) =>
    set((s) => ({ scans: patchOne(s.scans, scanId, { analysis }) })),
  setStatus: (scanId, status) =>
    set((s) => ({ scans: patchOne(s.scans, scanId, { status }) })),
  removeScan: (scanId) =>
    set((s) => ({
      scans: removeOne(s.scans, scanId),
      selectedScanId: s.selectedScanId === scanId ? null : s.selectedScanId,
    })),
  selectScan: (selectedScanId) => set({ selectedScanId }),
  clear: () => set({ scans: emptyEntities(), selectedScanId: null }),
}));

/* ------------------------------ selectors ------------------------------ */

export const selectScansNewestFirst = (s: ScanState) =>
  selectAll(s.scans).sort(newestFirst((x) => x.createdAt));

const completed = (s: ScanState) =>
  selectAll(s.scans).filter(
    (x) => x.status === "COMPLETED" && x.score !== null,
  );

export const selectLatestCompletedScan = (s: ScanState): SkinScan | null =>
  completed(s).sort(newestFirst((x) => x.createdAt))[0] ?? null;

export const selectSelectedScan = (s: ScanState): SkinScan | null =>
  s.selectedScanId ? (s.scans.byId[s.selectedScanId] ?? null) : null;

export const selectHasScanInProgress = (s: ScanState) =>
  selectAll(s.scans).some(
    (x) => x.status === "PENDING" || x.status === "PROCESSING",
  );

/** Oldest to newest, ready for a chart. */
export const selectScoreHistory = (s: ScanState) =>
  completed(s)
    .sort(oldestFirst((x) => x.createdAt))
    .map((x) => ({ at: x.createdAt, score: x.score!, skinAge: x.skinAge }));

/** Latest score minus previous score */
export function selectScoreDelta(s: ScanState): SkinScan | null {
  const scans = selectScansNewestFirst(s);

  if (scans.length < 2) return null;

  const latest = scans[0]!;
  const previous = scans[1]!;

  return {
    id: latest.id,
    userId: latest.userId,
    status: latest.status,
    aiObservation: latest.aiObservation,
    aiShortObservation: latest.aiShortObservation,
    aiSummary: latest.aiSummary,
    aiShortSummary: latest.aiShortSummary,
    image: latest.image,
    score: latest.score! - previous.score!,
    skinAge: latest.skinAge! - previous.skinAge!,
    analysis: calculateAnalysisDelta(latest.analysis, previous.analysis),
    createdAt: latest.createdAt,
  };
}

export function selectScoreDeltaPercent(s: ScanState): SkinScan | null {
  const scans = selectScansNewestFirst(s);

  if (scans.length < 2) return null;

  const latest = scans[0]!;
  const previous = scans[1]!;

  return {
    id: latest.id,
    userId: latest.userId,
    status: latest.status,
    aiObservation: latest.aiObservation,
    aiShortObservation: latest.aiShortObservation,
    aiSummary: latest.aiSummary,
    aiShortSummary: latest.aiShortSummary,
    image: latest.image,
    score: percentageChange(latest.score!, previous.score!),

    skinAge: percentageChange(latest.skinAge!, previous.skinAge!),

    analysis: calculateAnalysisDeltaPercent(latest.analysis, previous.analysis),

    createdAt: latest.createdAt,
  };
}

export function selectSortedAnalysisDelta(state: ScanState) {
  const delta = selectScoreDelta(state);

  if (!delta) return [];

  return sortAnalysisChange(delta);
}

export function selectSortedAnalysisDeltaPercent(state: ScanState) {
  const delta = selectScoreDeltaPercent(state);

  if (!delta) return [];

  return sortAnalysisChange(delta);
}
/* ------------------------------ hooks ------------------------------ */

export const useScans = () => useScanStore(useShallow(selectScansNewestFirst));
export const useLatestScan = () => useScanStore(selectLatestCompletedScan);

export const useScoreHistory = () =>
  useScanStore(useShallow(selectScoreHistory));

export const useScoreDelta = () => useScanStore(useShallow(selectScoreDelta));

export const useScoreDeltaPercent = () =>
  useScanStore(useShallow(selectScoreDeltaPercent));

export const useSortedAnalysisDelta = () =>
  useScanStore(useShallow(selectSortedAnalysisDelta));

export const useSortedAnalysisDeltaPercent = () =>
  useScanStore(useShallow(selectSortedAnalysisDeltaPercent));
