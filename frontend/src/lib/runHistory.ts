// The backend has no run-list endpoint yet, so recent runs are remembered locally.

export interface RecentRun {
  run_id: number;
  resume_label: string;
  job_count: number;
  created_at: string;
}

const STORAGE_KEY = "cv-analyzer.recent-runs";
const MAX_ENTRIES = 20;

export function listRecentRuns(): RecentRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentRun[]) : [];
  } catch {
    return [];
  }
}

export function rememberRun(entry: RecentRun): void {
  const rest = listRecentRuns().filter((run) => run.run_id !== entry.run_id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...rest].slice(0, MAX_ENTRIES)));
}
