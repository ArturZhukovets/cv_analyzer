import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";

import { ApiError, createRun, listResumes, listRuns, uploadResume } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type { ResumeRead } from "@/api/types";
import Button from "@/components/Button";
import RunList from "@/components/RunList";
import { formatDate } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const MAX_JOBS = 5;
const MAX_JOB_CHARS = 20000;
const RECENT_RUNS = 5;

function resumeLabel(resume: ResumeRead): string {
  return resume.parsed_json?.candidate_name ?? resume.filename;
}

function StepHeading({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm text-accent">{step}</span>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
      </div>
    </div>
  );
}

function ResumeOption({
  resume,
  selected,
  onSelect,
}: {
  resume: ResumeRead;
  selected: boolean;
  onSelect: () => void;
}) {
  const extracted = resume.parsed_json !== null;
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
        selected
          ? "border-accent bg-accent/5"
          : "border-line bg-white hover:border-ink-faint"
      } ${extracted ? "" : "cursor-not-allowed opacity-50"}`}
    >
      <input
        type="radio"
        name="resume"
        className="accent-accent"
        checked={selected}
        disabled={!extracted}
        onChange={onSelect}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{resumeLabel(resume)}</span>
        <span className="mt-0.5 block truncate font-mono text-xs text-ink-muted">
          {resume.filename} · {formatDate(resume.created_at)}
          {extracted
            ? ` · ${resume.parsed_json!.skills.length} skills`
            : " · couldn't read this file"}
        </span>
      </span>
    </label>
  );
}

export default function AnalyzePage() {
  useDocumentTitle("Analyze");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [jobTexts, setJobTexts] = useState<string[]>([""]);

  const resumesQuery = useQuery({ queryKey: queryKeys.resumes.all, queryFn: listResumes });
  const runsQuery = useQuery({ queryKey: queryKeys.runs.all, queryFn: listRuns });

  const upload = useMutation({
    mutationFn: uploadResume,
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
      if (resume.parsed_json !== null) setSelectedId(resume.id);
    },
  });

  const analyze = useMutation({
    mutationFn: createRun,
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      navigate(`/runs/${run.run_id}`);
    },
  });

  const selectedResume = resumesQuery.data?.find((resume) => resume.id === selectedId);
  const filledTexts = jobTexts.map((text) => text.trim()).filter((text) => text.length > 0);
  const canAnalyze = selectedResume !== undefined && filledTexts.length > 0 && !analyze.isPending;

  const setJobText = (index: number, value: string) =>
    setJobTexts((texts) => texts.map((text, i) => (i === index ? value : text)));

  const errorMessage = (error: unknown) =>
    error instanceof ApiError ? error.detail : "Something went wrong. Try again.";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          How well does your CV fit?
        </h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Pick a CV, paste in the jobs you're considering, and get an honest read on each one —
          matched skills, gaps, and whether it's worth applying.
        </p>
      </section>

      <section className="space-y-4">
        <StepHeading step={1} title="Choose a CV" hint="Upload a new file or pick one you've used before." />

        {resumesQuery.isLoading && <p className="text-sm text-ink-muted">Loading your CVs…</p>}
        {resumesQuery.isError && (
          <p className="text-sm text-fit-none">
            Couldn't load CVs: {errorMessage(resumesQuery.error)}
          </p>
        )}

        <div className="space-y-2">
          {resumesQuery.data?.map((resume) => (
            <ResumeOption
              key={resume.id}
              resume={resume}
              selected={selectedId === resume.id}
              onSelect={() => setSelectedId(resume.id)}
            />
          ))}
          {resumesQuery.data?.length === 0 && (
            <p className="rounded-md border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-ink-muted">
              No CVs yet — upload one below to get started.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            disabled={upload.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {upload.isPending ? "Reading your CV…" : "Upload a CV"}
          </Button>
          <span className="font-mono text-xs text-ink-faint">PDF or DOCX, up to 5 MB</span>
        </div>
        {upload.isError && (
          <p className="text-sm text-fit-none">Upload failed: {errorMessage(upload.error)}</p>
        )}
      </section>

      <section className={`space-y-4 ${selectedResume ? "" : "pointer-events-none opacity-40"}`}>
        <StepHeading
          step={2}
          title="Paste the jobs"
          hint={`Up to ${MAX_JOBS} job descriptions — one per box, full text.`}
        />

        {jobTexts.map((text, index) => (
          <div key={index} className="relative">
            <textarea
              value={text}
              maxLength={MAX_JOB_CHARS}
              rows={6}
              placeholder={`Job #${index + 1} — paste the full description here`}
              onChange={(event) => setJobText(index, event.target.value)}
              disabled={!selectedResume || analyze.isPending}
              className="w-full resize-y rounded-md border border-line bg-white p-3 text-sm leading-relaxed placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-accent"
            />
            {jobTexts.length > 1 && (
              <button
                type="button"
                onClick={() => setJobTexts((texts) => texts.filter((_, i) => i !== index))}
                disabled={analyze.isPending}
                className="absolute top-2 right-2 rounded px-1.5 text-sm text-ink-faint hover:text-fit-none focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={`Remove job ${index + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button
            variant="link"
            onClick={() => setJobTexts((texts) => [...texts, ""])}
            disabled={jobTexts.length >= MAX_JOBS || analyze.isPending}
          >
            + Add another job
          </Button>
          <Button
            disabled={!canAnalyze}
            onClick={() =>
              selectedResume &&
              analyze.mutate({ resume_id: selectedResume.id, job_texts: filledTexts })
            }
          >
            {analyze.isPending
              ? "Analyzing…"
              : filledTexts.length > 1
                ? `Analyze ${filledTexts.length} jobs`
                : "Analyze"}
          </Button>
        </div>

        {analyze.isPending && (
          <div className="rounded-md border border-line bg-white px-4 py-3">
            <p className="text-sm text-ink-muted">
              Reading each job against{" "}
              <span className="font-medium text-ink">{selectedResume && resumeLabel(selectedResume)}</span>
              's CV — usually under a minute.
            </p>
            <div className="mt-2 h-0.5 overflow-hidden rounded bg-line">
              <div className="h-full w-1/3 bg-accent motion-safe:animate-pulse" />
            </div>
          </div>
        )}
        {analyze.isError && (
          <p className="text-sm text-fit-none">Analysis failed: {errorMessage(analyze.error)}</p>
        )}
      </section>

      {runsQuery.data && runsQuery.data.length > 0 && (
        <section className="border-t border-line pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-xs tracking-[0.14em] text-ink-muted uppercase">
              Recent analyses · {runsQuery.data.length}
            </h2>
            {runsQuery.data.length > RECENT_RUNS && (
              <Link
                to="/history"
                className="rounded-sm text-sm font-medium text-accent hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View all
              </Link>
            )}
          </div>
          <div className="mt-4">
            <RunList runs={runsQuery.data.slice(0, RECENT_RUNS)} />
          </div>
        </section>
      )}
    </div>
  );
}
