# Career Intelligence Assistant — Remaining Work

Already done (not in this plan): SQLAlchemy models (`Resume`, `Run`, `Job`, `JobResult`),
app/DI scaffolding, settings, and CV intake end-to-end — `POST /api/resume/upload`
(validation, disk storage), `GET /api/resume` list, and LLM extraction into
schema-validated JSON (`client.responses.parse`, `openai` SDK, cheap model). PDFs go
to the model as raw files (vision handles scans/layout); DOCX text is extracted
locally with `python-docx` and capped by `max_docx_chars`.

Steps below are in implementation order.

---

## 1. Jobs input

- Endpoint accepting 1–10 pasted job texts (with length caps) → creates a `Run`
  + `Job` rows, kicks off analysis.
- Optional: URL field → best-effort fetch to prefill text (many boards block bots;
  pasted text stays the reliable path).

## 2. Analysis pipeline

Order: extract jobs → match skills → score → return diff immediately → narrate → persist.
Extraction and narration run per-job in parallel (`asyncio.gather`).

- **Job extraction** — cheap-model call per job, free text → job JSON
  (`is_valid_job_posting`, title, company, seniority, required/preferred skills,
  years_required, responsibilities). Invalid postings marked `is_valid=False`, skipped.
- **Skill matching** — `bge-small-en-v1.5` embeddings, cosine similarity between job
  and CV skills. >0.85 auto-match, 0.65–0.85 one batched LLM adjudication call,
  <0.65 gap. In-memory numpy only.
- **Score** — pure function, unit-testable, no LLM:
  `(1.0 * req_matched/req_total + 0.5 * pref_matched/pref_total) / 1.5`
- **Narrative** — one strong-model call per job (second model tier, add to settings):
  CV JSON + job JSON + computed diff + score →
  `{verdict, strengths, weaknesses, recommendation}`. It explains gaps, never recomputes
  them. Prompt: don't contradict the score, cite real roles/companies, refuse off-topic.
- Persist everything to `JobResult`.

## 3. Results + interview questions

- Results endpoint/page: job cards sorted by score — score, verdict, matched (green) /
  gap (red) skill chips, narrative below. Show the deterministic diff instantly,
  stream narratives in after.
- "Generate interview questions" — lazy LLM call reusing the computed gaps/strengths,
  persisted to `interview_qs_md`.

## 4. History

- List runs (CV name, job count, best score, date); click through renders fully
  cached results with zero LLM calls.

## 5. Frontend

- Pick one (Jinja or React) and commit to it. Pages: CV upload/select, jobs input,
  results, history.

## 6. Guardrails & observability

- Post-check: every company/role cited in a narrative must exist in the CV JSON.
- Structured JSON logs with `run_id` as trace ID; per-stage model/tokens/cost/latency,
  persisted on `JobResult`, surfaced in a `/debug/runs` view.

## 7. Testing

- Unit: schema validation, score math, skill matcher against fixtures — no API key needed.
- Golden set: 5 CVs × 5 jobs, assert exact gap sets. Mock LLM client everywhere.
- LLM-as-judge on narratives — small, manual, non-blocking.

## 8. Packaging

- Docker + compose, `make dev` / `make test`.

---

## Deliberately skipped (don't build)

Auth/multi-tenancy, vector DB (in-memory numpy handles ~40 vectors), RAG/chunking
(corpus fits in context; chunking a CV degrades quality), reranking, chat interface,
CV rewriting.
