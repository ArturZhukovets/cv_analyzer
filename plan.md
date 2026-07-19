# Career Intelligence Assistant — Remaining Work

Already done (not in this plan): SQLAlchemy models (`Resume`, `Run`, `Job`, `JobResult`),
app/DI scaffolding, settings, and CV intake end-to-end — `POST /api/resume/upload`
(validation, disk storage), `GET /api/resume` list, and LLM extraction into
schema-validated JSON (`client.responses.parse`, `openai` SDK, cheap model). PDFs go
to the model as raw files (vision handles scans/layout); DOCX text is extracted
locally with `python-docx` and capped by `max_docx_chars`.

Steps below are in implementation order.

## Progress status (updated)

- ✅ **Point 2 (Analysis) core is implemented**: prompt, pure input builder,
  strong-model structured call (`JobAnalysis`), parallel `analyze_run`, and
  per-job error isolation.
- ⏳ **Point 2 step 5 is pending by design**: invocation happens inside
  `POST /api/runs`, which belongs to point 1.
- ⏭️ **Next to implement**: point 1 (`POST /api/runs`) first, then point 3
  (`GET /api/runs/{id}`), then point 4 (`/ask`).

---

## User flow (two explicit steps)

1. **CV step** — upload a new CV or select a previously uploaded one. Nothing else
  is reachable until a resume is chosen.
2. **Jobs step** — paste 1–10 job descriptions against the selected CV → analysis runs.

The API enforces this: creating a run requires a valid `resume_id` whose extraction
succeeded (`400` otherwise). The frontend mirrors it as two screens.

## 1. Jobs input

- `POST /api/runs` — body: `resume_id` + 1–5 pasted job texts (per-text length cap). Validates the resume exists and has parsed CV JSON, creates a `Run` + `Job` rows,
kicks off analysis, returns `run_id`.
- Pasted text only. No URL fetching (most boards block bots; not worth the code).

**Build steps**

1. `schemas/runs.py` — `RunCreate` (`resume_id: int`, `job_texts: list[str]` with
   `min_length=1`, `max_length=5`, per-item length cap) and a `RunRead` response
   (`run_id`, `resume_id`, `created_at`).
2. Router `routers/runs.py`, `POST /api/runs`: load the resume; `400` if missing or
   `parsed_json is None`. Create the `Run`, then one `Job` row per pasted text.
3. Kick off analysis (§2) for all jobs, then return `run_id`.
   - Wire the already-implemented `analyze_run(run, db, llm)` here.
   - MVP: run inline (await before response). Switch to background only if
     latency hurts.
4. Register the router in the app factory.


## 2. Analysis — one LLM call per job

No embeddings, no separate extraction/matching/narration stages. Per job, one
structured call (strong model), all jobs in parallel via `asyncio.gather`. Output
is the `JobAnalysis` schema (`schemas/jobs.py`), persisted to `JobResult`.

- **Input**: CV JSON + raw job text.
- **Output** (schema-validated, persisted to `JobResult.result_json`):
  - Job fields: `is_valid_job_posting`, `rejection_reason`, `title`, `company`,
  `seniority`, `years_required`.
  - `skills`: one flat `list[JobSkill]` — each `{name, matched}`, no
  required/preferred split. Frontend filters on `matched` for green/red chips.
  - Judgment: `recommendation` (enum `strong_fit | possible_fit | stretch |
  not_a_fit`) + `assessment` (free-text verdict: fit rationale, strengths grounded
  in real CV roles, and the gaps that matter).
  - Invalid postings get `is_valid_job_posting=False` + `rejection_reason` and skip
  the comparison fields.
- No numeric score — the qualitative `recommendation` carries ranking/sorting.
- Prompt rules: match skills semantically (e.g. "Django" satisfies "Python web
frameworks"), cite only roles/companies that exist in the CV JSON, never invent
skills on either side.

**Build steps** *(steps 1–4 already done; step 5 depends on point 1 router)*

1. Prompt builder — a pure function `(cv_json, job_text) -> messages`, embedding the
   rules above. Keep it testable without an API key.
2. Service `services/analysis.py`: `analyze_job(cv_json, job_text) -> JobAnalysis`
   via `client.responses.parse(..., text_format=JobAnalysis)` on the strong model.
3. `analyze_run(run)` — gather `analyze_job` over all jobs with `asyncio.gather`;
   persist each `JobAnalysis` to its `JobResult.result_json`.
4. Error isolation — wrap each job so one failure doesn't sink the batch; record a
   failed marker on that `JobResult` instead.
5. Invocation — MVP can run analysis inline in `POST /api/runs` (await before
   responding); switch to a background task only if latency hurts.



## 3. Results

- `GET /api/runs/{id}` — job cards sorted by `recommendation` (strong_fit first):
recommendation badge, matched (green) / missing (red) skill chips from `skills`, and
the `assessment` text below. Everything reads from persisted `JobResult` — repeat
views cost zero LLM calls.


## 4. Q&A over a run — `/ask`

The point of the product: answer free-form questions about fit, gaps, and prep.

- `POST /api/runs/{id}/ask` — body: `question`. Stuff CV JSON + all job JSONs +
computed results into context (it all fits; no RAG), answer with the strong model.
Handles "What skills am I missing for this role?", "How does my experience align
with Job #2?", and interview-prep questions — no separate interview-questions
feature needed.
- Single question → answer. No chat history, no sessions.
- Prompt: answer only from the provided CV/jobs/results, don't contradict the
persisted `recommendation`/`assessment`/matched skills, refuse off-topic questions.



## 5. Cover letter — per job

- `POST /api/jobs/{id}/cover-letter` — one strong-model call: CV JSON + job JSON +
computed match results → short, concise cover letter (markdown) tailored to that
job, leaning on the persisted `assessment` and citing only real CV experience.
- Persist to `JobResult.cover_letter_md`; repeat calls return the cached letter
unless `regenerate=true`.



## 6. History

- `GET /api/runs` — list runs (CV name, job count, best `recommendation`, date);
click through renders fully cached results with zero LLM calls.



## 7. Frontend

- React — Vite + React 19 + TS SPA in `frontend/` (scaffolded; see root `CLAUDE.md`).
- Screens follow the two-step flow: (1) CV upload/select → (2) jobs input →
results (with ask box + per-job cover-letter button) → history.



## 8. Testing

- Unit: schema validation, prompt builder output — no API key needed.
- Fixtures: a few CV JSON + job-text pairs with a mocked `JobAnalysis` response.
Mock LLM client everywhere.



## 9. Packaging

- Docker + compose, `make dev` / `make test`.

---



## Deferred until the core loop works (don't build yet)

Narrative guardrail post-check (cited companies exist in CV JSON), structured JSON
logs with `run_id` tracing + per-stage token/cost accounting, golden-set eval
(5 CVs × 5 jobs), LLM-as-judge.

## Deliberately skipped (don't build)

Auth/multi-tenancy, embeddings/vector DB (LLM matches skills semantically in the
analysis call), RAG/chunking (corpus fits in context; chunking a CV degrades
quality), reranking, chat history/sessions, CV rewriting, job URL fetching.