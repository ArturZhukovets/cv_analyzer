import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { ApiError, askRun, createCoverLetter, getRun } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type { JobAnalysis, RunJobResultRead } from "@/api/types";
import Button from "@/components/Button";
import Markdown from "@/components/Markdown";
import Skeleton from "@/components/Skeleton";
import VerdictBadge from "@/components/VerdictBadge";
import { formatDate } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { VERDICTS } from "@/lib/verdicts";

const MAX_QUESTION_CHARS = 2000;

function errorDetail(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.detail : fallback;
}

function SkillLedger({ analysis }: { analysis: JobAnalysis }) {
  if (analysis.skills.length === 0) return null;
  const matched = analysis.skills.filter((skill) => skill.matched);
  const missing = analysis.skills.filter((skill) => !skill.matched);
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-ink-muted">
        {matched.length} of {analysis.skills.length} required skills found in your CV
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

function CoverLetterSection({ jobId }: { jobId: number }) {
  const [letterMd, setLetterMd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const letter = useMutation({
    mutationFn: (regenerate: boolean) => createCoverLetter(jobId, regenerate),
    onSuccess: (data) => setLetterMd(data.cover_letter_md),
  });

  const copyLetter = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure origin / denied) — leave the button as-is
    }
  };

  if (letterMd === null) {
    return (
      <div>
        <Button variant="secondary" disabled={letter.isPending} onClick={() => letter.mutate(false)}>
          {letter.isPending ? "Drafting…" : "Draft a cover letter"}
        </Button>
        {letter.isError && (
          <p className="mt-2 text-sm text-fit-none">
            {errorDetail(letter.error, "Couldn't draft a cover letter. Try again.")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-[0.12em] text-ink-muted uppercase">Cover letter</p>
        <div className="flex gap-3">
          <Button variant="link" onClick={() => copyLetter(letterMd)}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Button variant="muted" disabled={letter.isPending} onClick={() => letter.mutate(true)}>
            {letter.isPending ? "Redrafting…" : "Regenerate"}
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-line bg-paper/60 p-4">
        <Markdown>{letterMd}</Markdown>
      </div>
      {letter.isError && (
        <p className="text-sm text-fit-none">
          {errorDetail(letter.error, "Couldn't regenerate the letter. The previous one is shown.")}
        </p>
      )}
    </div>
  );
}

function AskPanel({ runId }: { runId: number }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<{ question: string; answer: string }[]>([]);

  const ask = useMutation({
    mutationFn: (asked: string) => askRun(runId, asked),
    onSuccess: (data) => {
      setThread((prev) => [...prev, { question: data.question, answer: data.answer }]);
      setQuestion("");
    },
  });

  const trimmed = question.trim();
  const canAsk = trimmed.length > 0 && !ask.isPending;

  const submit = () => {
    if (canAsk) ask.mutate(trimmed);
  };

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">Ask about these results</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Missing skills, how you compare across the jobs, what to prep for an interview — answered
        from your CV and these results.
      </p>

      {thread.length > 0 && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          {thread.map((turn, i) => (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium text-ink-muted">“{turn.question}”</p>
              <Markdown>{turn.answer}</Markdown>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          value={question}
          maxLength={MAX_QUESTION_CHARS}
          rows={2}
          disabled={ask.isPending}
          placeholder="e.g. What skills am I missing for the strongest fit here?"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="w-full resize-y rounded-md border border-line bg-white p-3 text-sm leading-relaxed placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <Button className="shrink-0" disabled={!canAsk} onClick={submit}>
          {ask.isPending ? "Thinking…" : thread.length > 0 ? "Ask again" : "Ask"}
        </Button>
      </div>

      {ask.isError && (
        <p className="mt-3 text-sm text-fit-none">
          {errorDetail(ask.error, "Couldn't answer that. Try again.")}
        </p>
      )}
    </section>
  );
}

function JobCard({ job, index }: { job: RunJobResultRead; index: number }) {
  const analysis = job.result;

  if (analysis === null) {
    return (
      <article className="rounded-md border border-line bg-white p-5">
        <p className="font-mono text-xs text-ink-faint">Job #{index + 1}</p>
        <p className="mt-2 text-sm text-fit-none">
          {job.error ?? "This job couldn't be analyzed."}
        </p>
      </article>
    );
  }

  if (!analysis.is_valid_job_posting) {
    return (
      <article className="rounded-md border border-line bg-white p-5">
        <p className="font-mono text-xs text-ink-faint">Job #{index + 1}</p>
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
        {analysis.title ?? `Job #${index + 1}`}
      </h2>
      {analysis.company && <p className="text-sm text-ink-muted">{analysis.company}</p>}
      <p className="mt-3 max-w-prose text-sm leading-relaxed">{analysis.assessment}</p>
      <div className="mt-4 border-t border-line pt-4">
        <SkillLedger analysis={analysis} />
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <CoverLetterSection jobId={job.job_id} />
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

  useDocumentTitle(runQuery.data ? `Results · Run #${runQuery.data.run_id}` : "Results");

  if (runQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-md border border-line bg-white p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (runQuery.isError || !runQuery.data) {
    const message =
      runQuery.error instanceof ApiError ? runQuery.error.detail : "Couldn't load this run.";
    return (
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Analysis not found</h1>
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
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your results</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            Run #{run.run_id} · {formatDate(run.created_at)} · {run.jobs.length}{" "}
            {run.jobs.length === 1 ? "job" : "jobs"} · sorted by best fit
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
      <AskPanel runId={run.run_id} />
    </div>
  );
}
