import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { newestFirst, oldestFirst } from "../utils/dates";
import {
  emptyEntities,
  patchOne,
  removeOne,
  selectAll,
  setAll,
  upsertMany,
  upsertOne,
} from "../utils/entities";
import {
  calculateAnalysisDelta,
  calculateAnalysisDeltaPercent,
  sortAnalysisChange,
} from "../utils/analysis";
import { percentageChange } from "../utils/math";
import { dayKey, filterByRange } from "../utils/dateRange";
import { type Range } from "../utils/dateRange";
import { useMemo } from "react";

interface ScanState {
  scans: Entities<SkinScan>;
  /** Scan the user is currently viewing. */
  selectedScanId: string | null;
  initialized: boolean;

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
  initialized: false,

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
export const selectScanHistory = (s: ScanState) =>
  completed(s).sort(oldestFirst((x) => x.createdAt));

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
    skinType: latest.skinType,
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
    skinType: latest.skinType,
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

export function selectAverageScore(
  state: ScanState,
  fromDate: string | null,
  toDate: string | null,
) {
  const scans = selectScanHistoryInRange(state, fromDate, toDate);
  if (scans.length === 0) return null;
  return scans.reduce((sum, scan) => sum + (scan.score || 0), 0) / scans.length;
}

/** Completed scans, oldest -> newest, limited to [start, end] (YYYY-MM-DD, inclusive). */
export const selectScanHistoryInRange = (
  s: ScanState,
  start: string | null,
  end: string | null,
) => filterByRange(selectScanHistory(s), start, end);

/** First and last completed scan day, or null when there are no scans. */
export const selectScanBounds = (s: ScanState): Range | null => {
  const history = selectScanHistory(s);
  if (!history.length) return null;
  return {
    start: dayKey(history[0].createdAt),
    end: dayKey(history[history.length - 1].createdAt),
  };
};

/* ------------------------------ hooks ------------------------------ */

export const useScans = () => useScanStore(useShallow(selectScansNewestFirst));
export const useLatestScan = () => useScanStore(selectLatestCompletedScan);
export const useAverageScore = (
  fromDate: string | null,
  toDate: string | null,
) => useScanStore(useShallow((s) => selectAverageScore(s, fromDate, toDate)));
export const useScanHistory = () => useScanStore(useShallow(selectScanHistory));

/** Completed scans inside the date range, oldest -> newest. Re-runs when the dates or scans change. */
export const useScanHistoryInRange = (
  start: string | null,
  end: string | null,
) => useScanStore(useShallow((s) => selectScanHistoryInRange(s, start, end)));

/** Full span of completed scans, for the date picker's min/max and the "All time" preset. */
export const useScanBounds = () => useScanStore(useShallow(selectScanBounds));

/** Latest scan in the range plus the scan right before it (even if that one is outside the range). */
export const useScanComparison = (start: string | null, end: string | null) => {
  const history = useScanHistory();
  return useMemo(() => {
    const inRange = filterByRange(history, start, end);
    const current = inRange[inRange.length - 1] ?? null;
    if (!current) return { current: null, previous: null };
    const idx = history.indexOf(current);
    return { current, previous: idx > 0 ? history[idx - 1] : null };
  }, [history, start, end]);
};

export const useScoreDelta = () => {
  const scans = useScanStore((s) => s.scans);
  return useMemo(() => selectScoreDelta({ scans } as ScanState), [scans]);
};

export const useScoreDeltaPercent = () => {
  const scans = useScanStore((s) => s.scans);
  return useMemo(
    () => selectScoreDeltaPercent({ scans } as ScanState),
    [scans],
  );
};

export const useSortedAnalysisDelta = () => {
  const scans = useScanStore((s) => s.scans);
  return useMemo(
    () => selectSortedAnalysisDelta({ scans } as ScanState),
    [scans],
  );
};

export const useSortedAnalysisDeltaPercent = () => {
  const scans = useScanStore((s) => s.scans);
  return useMemo(
    () => selectSortedAnalysisDeltaPercent({ scans } as ScanState),
    [scans],
  );
};

useScanStore.subscribe((state) => {
  state.scans.ids.forEach((scanId) => {
    const scan = state.scans.byId[scanId];
    if (scan && scan.image && !scan.image.includes("http")) {
      scan.image = `${import.meta.env.VITE_SERVER_URL}\\${scan.image}`;
      useScanStore.getState().upsertScan(scan);
    }
  });
});
