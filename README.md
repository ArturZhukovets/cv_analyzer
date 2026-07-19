# Career Intelligence Assistant

Analyzes a CV against job descriptions. Tells you what skills you're missing,
how well you fit each role, and what to prepare for in an interview.

## Setup

    cp .env.example .env      # add OPENAI_API_KEY
    ./run.sh                  # → http://localhost:8000

## Flow

1. **Upload a CV** (PDF/DOCX) or reuse a previous one. New CVs are parsed once
   into JSON and saved — reuse costs zero LLM calls.
2. **Paste job descriptions** (up to 10). Postings live on the web, not on disk,
   so paste is the natural input.
3. **Submit.** Jobs are parsed in parallel, skills matched, score computed.
   The match/gap breakdown appears instantly; the written verdict streams in after.
4. **Read results.** Sorted best-fit first. Score, green chips for skills you have,
   red for gaps, plus strengths and weaknesses in prose.
5. **Interview prep.** One button per job, built from your actual gaps.
6. **History.** Past runs reopen with no LLM calls.

## How it works

    CV ──► LLM ──► CV JSON ─┐
                            ├─► skill match ──► score + gaps ──► [shown instantly]
    Jobs ─► LLM ─► Job JSON ┘                          │
                                                       ▼
                                              LLM judgment ──► [streams in below]

**The computer decides** what overlaps and what the score is — set math on JSON,
testable, can't hallucinate. **The LLM decides** what the gaps *mean* (does 4 years
of Django cover "Flask preferred"?). It gets the computed score and is told not to
contradict it.

**Skill matching** uses a local embedding model so "React" and "ReactJS" match.
Close → pass, borderline → one cheap LLM check, distant → gap. ~40 vectors in memory,
no vector DB.

**No RAG.** CV + 10 postings ≈ 15k tokens — it fits in context. Chunking a two-page
CV would break career chronology and make answers worse.

## Stack

FastAPI · SQLite · Claude Haiku (parsing) / Sonnet (judgment) ·
`bge-small-en-v1.5` local · no orchestration framework · Docker

## Guardrails

Non-CVs and non-postings rejected before any expensive call. Every role the LLM
cites must exist in your CV — checked after generation. Score is calculated, never
generated.

## Observability & Testing

Trace ID per run; model, tokens, cost, latency logged per stage at `/debug/runs`.
`make test` — the scoring core runs without an API key. Golden set asserts exact
gap lists; narrative quality judged separately, non-blocking.

## Not built (on purpose)

Auth · vector DB · RAG · chat interface · CV rewriting