import { Link } from "react-router";

import { formatDate } from "@/lib/format";
import { listRecentRuns } from "@/lib/runHistory";

export default function HistoryPage() {
  const runs = listRecentRuns();

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold tracking-tight">History</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Analyses from this browser. Opening one re-reads saved results — no new analysis runs.
      </p>

      {runs.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-ink-muted">
          Nothing here yet.{" "}
          <Link to="/" className="text-accent hover:underline">
            Run your first analysis
          </Link>{" "}
          and it will show up here.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-md border border-line bg-white">
          {runs.map((run) => (
            <li key={run.run_id}>
              <Link
                to={`/runs/${run.run_id}`}
                className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-accent/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{run.resume_label}</span>
                  <span className="font-mono text-xs text-ink-muted">
                    Run #{run.run_id} · {run.job_count}{" "}
                    {run.job_count === 1 ? "posting" : "postings"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-faint">
                  {formatDate(run.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
