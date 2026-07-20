import { Link } from "react-router";

import type { RunSummaryRead } from "@/api/types";
import Skeleton from "@/components/Skeleton";
import VerdictBadge from "@/components/VerdictBadge";
import { formatDate } from "@/lib/format";

export function RunListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </span>
          <Skeleton className="h-5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

function runTitle(run: RunSummaryRead): { heading: string; subtitle: string } {
  const jobs = `${run.job_count} ${run.job_count === 1 ? "job" : "jobs"}`;
  const cv = run.candidate_name ?? run.resume_filename;

  if (run.top_job_title) {
    const more = run.job_count > 1 ? ` +${run.job_count - 1} more` : "";
    return {
      heading: `${run.top_job_title}${more}`,
      subtitle: `${cv} · Run #${run.run_id} · ${jobs}`,
    };
  }
  return { heading: cv, subtitle: `Run #${run.run_id} · ${jobs}` };
}

export default function RunList({ runs }: { runs: RunSummaryRead[] }) {
  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-white">
      {runs.map((run) => {
        const { heading, subtitle } = runTitle(run);
        return (
        <li key={run.run_id}>
          <Link
            to={`/runs/${run.run_id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{heading}</span>
              <span className="block truncate font-mono text-xs text-ink-muted">{subtitle}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {run.best_recommendation && (
                <VerdictBadge recommendation={run.best_recommendation} />
              )}
              <span className="font-mono text-xs text-ink-faint">
                {formatDate(run.created_at)}
              </span>
            </span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
