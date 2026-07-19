import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { ApiError, getRun } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type { JobAnalysis, RunJobResultRead } from "@/api/types";
import VerdictBadge from "@/components/VerdictBadge";
import { formatDate } from "@/lib/format";
import { VERDICTS } from "@/lib/verdicts";

function SkillLedger({ analysis }: { analysis: JobAnalysis }) {
  if (analysis.skills.length === 0) return null;
  const matched = analysis.skills.filter((skill) => skill.matched);
  const missing = analysis.skills.filter((skill) => !skill.matched);
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-ink-muted">
        {matched.length}/{analysis.skills.length} skills evidenced in the CV
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {matched.map((skill) => (
          <li
            key={skill.name}
            className="rounded-full border border-fit-strong/30 bg-fit-strong/10 px-2.5 py-0.5 text-xs text-fit-strong"
          >
            ✓ {skill.name}
          </li>
        ))}
        {missing.map((skill) => (
          <li
            key={skill.name}
            className="rounded-full border border-fit-none/25 bg-fit-none/8 px-2.5 py-0.5 text-xs text-fit-none"
          >
            ✕ {skill.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobCard({ job, index }: { job: RunJobResultRead; index: number }) {
  const analysis = job.result;

  if (analysis === null) {
    return (
      <article className="rounded-md border border-line bg-white p-5">
        <p className="font-mono text-xs text-ink-faint">Posting #{index + 1}</p>
        <p className="mt-2 text-sm text-fit-none">
          {job.error ?? "This posting couldn't be analyzed."}
        </p>
      </article>
    );
  }

  if (!analysis.is_valid_job_posting) {
    return (
      <article className="rounded-md border border-line bg-white p-5">
        <p className="font-mono text-xs text-ink-faint">Posting #{index + 1}</p>
        <p className="mt-2 font-medium">Not a job posting</p>
        <p className="mt-1 text-sm text-ink-muted">
          {analysis.rejection_reason ?? "The pasted text doesn't look like a job description."}
        </p>
      </article>
    );
  }

  const meta = [
    analysis.seniority,
    analysis.years_required !== null ? `${analysis.years_required}+ yrs` : null,
  ].filter(Boolean);

  return (
    <article className="relative overflow-hidden rounded-md border border-line bg-white p-5 pl-6">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${VERDICTS[analysis.recommendation].rail}`}
        aria-hidden
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerdictBadge recommendation={analysis.recommendation} />
        {meta.length > 0 && (
          <span className="font-mono text-xs text-ink-muted uppercase">{meta.join(" · ")}</span>
        )}
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
        {analysis.title ?? `Posting #${index + 1}`}
      </h2>
      {analysis.company && <p className="text-sm text-ink-muted">{analysis.company}</p>}
      <p className="mt-3 max-w-prose text-sm leading-relaxed">{analysis.assessment}</p>
      <div className="mt-4 border-t border-line pt-4">
        <SkillLedger analysis={analysis} />
      </div>
    </article>
  );
}

export default function RunPage() {
  const { runId } = useParams();
  const id = Number(runId);

  const runQuery = useQuery({
    queryKey: queryKeys.runs.detail(id),
    queryFn: () => getRun(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  if (runQuery.isLoading) {
    return <p className="text-sm text-ink-muted">Loading run…</p>;
  }

  if (runQuery.isError || !runQuery.data) {
    const message =
      runQuery.error instanceof ApiError ? runQuery.error.detail : "Couldn't load this run.";
    return (
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Run not found</h1>
        <p className="mt-2 text-ink-muted">
          {message}{" "}
          <Link to="/" className="text-accent hover:underline">
            Start a new analysis
          </Link>
          .
        </p>
      </section>
    );
  }

  const run = runQuery.data;
  return (
    <div className="space-y-6">
      <section className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Verdicts</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            Run #{run.run_id} · {formatDate(run.created_at)} · {run.jobs.length}{" "}
            {run.jobs.length === 1 ? "posting" : "postings"} · sorted by fit
          </p>
        </div>
        <Link
          to="/"
          className="text-sm font-medium text-accent hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          New analysis
        </Link>
      </section>
      <div className="space-y-4">
        {run.jobs.map((job, index) => (
          <JobCard key={job.job_id} job={job} index={index} />
        ))}
      </div>
    </div>
  );
}
