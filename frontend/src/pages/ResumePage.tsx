import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError, deleteResume, getResume, updateResume } from "@/api/client";
import { queryKeys } from "@/api/keys";
import type { ExperienceEntry, ExtractedResume, Seniority } from "@/api/types";
import Button from "@/components/Button";
import Skeleton from "@/components/Skeleton";
import TrashIcon from "@/components/TrashIcon";
import { formatDate } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SENIORITY_OPTIONS: Seniority[] = ["junior", "mid", "senior", "lead", "principal"];

const fieldClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60";

const labelClass = "block text-sm font-medium";
const hintClass = "mt-0.5 text-xs text-ink-muted";

function emptyExperience(): ExperienceEntry {
  return { company: "", title: "", description: null };
}

function cloneExtracted(data: ExtractedResume): ExtractedResume {
  return structuredClone(data);
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {children}
      </label>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (skills: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addSkill = () => {
    const name = draft.trim();
    if (!name) return;
    if (skills.some((skill) => skill.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, name]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <li
              key={skill}
              className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(skills.filter((item) => item !== skill))}
                className="rounded text-ink-faint hover:text-fit-none focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={`Remove ${skill}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill"
          className={fieldClass}
        />
        <Button variant="secondary" onClick={addSkill} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function ExperienceEditor({
  entries,
  onChange,
}: {
  entries: ExperienceEntry[];
  onChange: (entries: ExperienceEntry[]) => void;
}) {
  const update = (index: number, patch: Partial<ExperienceEntry>) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={index} className="space-y-3 rounded-md border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs text-ink-muted">Role {index + 1}</p>
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
              className="rounded px-1 text-sm text-ink-faint hover:text-fit-none focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`Remove role ${index + 1}`}
            >
              ✕
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`exp-title-${index}`}>Title</FieldLabel>
              <input
                id={`exp-title-${index}`}
                type="text"
                value={entry.title}
                onChange={(event) => update(index, { title: event.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`exp-company-${index}`}>Company</FieldLabel>
              <input
                id={`exp-company-${index}`}
                type="text"
                value={entry.company}
                onChange={(event) => update(index, { company: event.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={`exp-desc-${index}`}>Description</FieldLabel>
            <textarea
              id={`exp-desc-${index}`}
              rows={3}
              value={entry.description ?? ""}
              onChange={(event) =>
                update(index, { description: event.target.value || null })
              }
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </div>
        </div>
      ))}
      <Button variant="link" onClick={() => onChange([...entries, emptyExperience()])}>
        + Add role
      </Button>
    </div>
  );
}

function ResumeForm({
  draft,
  onChange,
  onSave,
  canSave,
  saving,
  statusMessage,
  statusTone,
}: {
  draft: ExtractedResume;
  onChange: (next: ExtractedResume) => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  statusMessage: string | null;
  statusTone: "muted" | "error" | "ok";
}) {
  const set = <K extends keyof ExtractedResume>(key: K, value: ExtractedResume[K]) =>
    onChange({ ...draft, [key]: value });

  const statusClass =
    statusTone === "error"
      ? "text-fit-none"
      : statusTone === "ok"
        ? "text-fit-strong"
        : "text-ink-muted";

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave();
      }}
    >
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Basics</h2>
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="candidate_name">Candidate name</FieldLabel>
            <input
              id="candidate_name"
              type="text"
              value={draft.candidate_name ?? ""}
              onChange={(event) => set("candidate_name", event.target.value || null)}
              className={fieldClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div>
              <FieldLabel htmlFor="seniority">Seniority</FieldLabel>
              <select
                id="seniority"
                value={draft.seniority ?? ""}
                onChange={(event) =>
                  set("seniority", (event.target.value || null) as Seniority | null)
                }
                className={fieldClass}
              >
                <option value="">Not set</option>
                {SENIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="years" hint="Estimated from the CV.">
                Years of experience
              </FieldLabel>
              <input
                id="years"
                type="number"
                min={0}
                step={0.5}
                value={draft.total_years_experience ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  set("total_years_experience", raw === "" ? null : Number(raw));
                }}
                className={fieldClass}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Validity</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-accent"
            checked={draft.is_valid_resume}
            onChange={(event) => set("is_valid_resume", event.target.checked)}
          />
          Valid resume
        </label>
        {!draft.is_valid_resume && (
          <div>
            <FieldLabel htmlFor="rejection_reason">Rejection reason</FieldLabel>
            <input
              id="rejection_reason"
              type="text"
              value={draft.rejection_reason ?? ""}
              onChange={(event) => set("rejection_reason", event.target.value || null)}
              className={fieldClass}
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Skills</h2>
          <p className={hintClass}>Matched against job requirements during analysis.</p>
        </div>
        <SkillsEditor skills={draft.skills} onChange={(skills) => set("skills", skills)} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Experience</h2>
          <p className={hintClass}>Roles extracted from the CV.</p>
        </div>
        <ExperienceEditor
          entries={draft.experience}
          onChange={(experience) => set("experience", experience)}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Profile</h2>
          <p className={hintClass}>
            Education, certifications, projects, languages, and other context not captured above.
          </p>
        </div>
        <textarea
          id="profile_text"
          rows={8}
          value={draft.profile_text ?? ""}
          onChange={(event) => set("profile_text", event.target.value || null)}
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </section>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
        <p className={`text-sm ${statusClass}`}>{statusMessage}</p>
        <Button type="submit" disabled={!canSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export default function ResumePage() {
  const { resumeId: resumeIdParam } = useParams();
  const resumeId = Number(resumeIdParam);
  const validId = Number.isInteger(resumeId) && resumeId > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const resumeQuery = useQuery({
    queryKey: queryKeys.resumes.detail(resumeId),
    queryFn: () => getResume(resumeId),
    enabled: validId,
  });

  const [draft, setDraft] = useState<ExtractedResume | null>(null);

  useEffect(() => {
    const parsed = resumeQuery.data?.parsed_json;
    setDraft(parsed ? cloneExtracted(parsed) : null);
  }, [resumeQuery.data]);

  const save = useMutation({
    mutationFn: (payload: ExtractedResume) => updateResume(resumeId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.resumes.detail(resumeId), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteResume(resumeId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.resumes.detail(resumeId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      navigate("/");
    },
  });

  const dirty =
    draft !== null &&
    JSON.stringify(draft) !== JSON.stringify(resumeQuery.data?.parsed_json ?? null);
  const canSave = dirty && !save.isPending;

  let statusMessage: string | null = null;
  let statusTone: "muted" | "error" | "ok" = "muted";
  if (save.isError) {
    statusMessage =
      save.error instanceof ApiError ? save.error.detail : "Couldn't save changes.";
    statusTone = "error";
  } else if (save.isSuccess && !dirty) {
    statusMessage = "Saved.";
    statusTone = "ok";
  } else if (dirty) {
    statusMessage = "Unsaved changes.";
  }

  const title =
    draft?.candidate_name ??
    resumeQuery.data?.filename ??
    (validId ? `CV #${resumeId}` : "CV");
  useDocumentTitle(title);

  if (!validId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-fit-none">That CV id doesn't look right.</p>
        <Link to="/" className="text-sm font-medium text-accent hover:text-accent-deep">
          ← Back to analyze
        </Link>
      </div>
    );
  }

  if (resumeQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (resumeQuery.isError) {
    const detail =
      resumeQuery.error instanceof ApiError
        ? resumeQuery.error.detail
        : "Couldn't load this CV.";
    return (
      <div className="space-y-4">
        <p className="text-sm text-fit-none">{detail}</p>
        <Link to="/" className="text-sm font-medium text-accent hover:text-accent-deep">
          ← Back to analyze
        </Link>
      </div>
    );
  }

  const resume = resumeQuery.data!;

  const deleteError =
    remove.isError
      ? remove.error instanceof ApiError
        ? remove.error.detail
        : "Couldn't delete this CV."
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/"
            className="rounded-sm text-sm font-medium text-accent hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ← Back to analyze
          </Link>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {draft?.candidate_name ?? resume.filename}
          </h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            {resume.filename} · uploaded {formatDate(resume.created_at)}
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1.5 text-fit-none transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
          disabled={remove.isPending}
          aria-label={remove.isPending ? "Deleting CV" : "Delete CV"}
          onClick={() => {
            if (
              window.confirm(
                "Delete this CV and all analyses that used it? This can't be undone.",
              )
            ) {
              remove.mutate();
            }
          }}
        >
          <TrashIcon className="size-5" />
        </button>
      </div>

      {deleteError && <p className="text-sm text-fit-none">{deleteError}</p>}

      {draft === null ? (
        <p className="rounded-md border border-dashed border-line bg-white px-4 py-6 text-sm text-ink-muted">
          Extraction didn't produce structured data for this file, so there's nothing to edit yet.
        </p>
      ) : (
        <ResumeForm
          draft={draft}
          onChange={(next) => {
            save.reset();
            setDraft(next);
          }}
          onSave={() => save.mutate(draft)}
          canSave={canSave}
          saving={save.isPending}
          statusMessage={statusMessage}
          statusTone={statusTone}
        />
      )}
    </div>
  );
}
