# Plan: move `/ask` history from LangGraph checkpoints to the app DB

**Goal:** conversation history lives in `cv_analyzer.db` as ordinary rows, readable by the API and renderable by the SPA. Same LLM behavior as today (fresh CV+jobs blob each turn, history in front of it). LangGraph drops out of `/ask` entirely.

**Why:** `RunPage` keeps the thread in `useState` and no endpoint exposes history — after a reload the UI is empty while the model still remembers. History is persisted somewhere the app can't read.

---

## 1. Model — `models/message.py`

```python
class RunMessage(Base, TimestampMixin):
    __tablename__ = "run_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"), nullable=False, index=True)
    role: Mapped[str]      # "user" | "assistant"
    content: Mapped[str]

    run: Mapped[Run] = relationship(back_populates="messages")
```

- Add `messages` relationship on `Run` with `cascade="all, delete-orphan"`, `order_by="RunMessage.id"`.
- Export from `models/__init__.py` so `Base.metadata.create_all` picks it up.

## 2. Service — `services/llm/service.py`

`answer_run_question` takes `history: list[AnyMessage]` instead of `run_id`, and returns a plain `ainvoke`:

```python
async def answer_run_question(self, cv_json, jobs, question, history) -> str:
    system_prompt = ASK_RUN_PROMPT.read_text(encoding="utf-8")
    return await self._text.ainvoke([
        SystemMessage(system_prompt),
        HumanMessage(build_ask_context(cv_json, jobs)),
        *history,
        HumanMessage(question),
    ])
```

Delete: `compile_ask_graph`, `self._ask_graph`, the `is None` guard, and the content-block join at the end — `self._text` already ends in `StrOutputParser()`.

## 3. Route — `api/routes/runs.py`

In `ask_run`, around the existing CV/jobs lookup:

1. Load the last N messages for the run (`ORDER BY id DESC LIMIT 20`, re-reverse) and map to `HumanMessage`/`AIMessage`.
2. Call the service.
3. Insert both rows (`user` question, `assistant` answer), commit.

Add `GET /runs/{run_id}/messages` → `list[RunMessageOut]` (`id`, `role`, `content`, `created_at`) in `schemas/runs.py`.

## 4. Teardown

- `app.py`: drop the `AsyncSqliteSaver` block and `compile_ask_graph` from `lifespan`; keep `create_all`.
- `services/llm/ask.py`: keep only `build_ask_context` (move it to `messages.py` and delete the file if preferred). Removes `AskState`, `build_ask_graph`.
- `pyproject.toml`: `uv remove langgraph-checkpoint-sqlite`. Keep `langgraph` only if something else uses it.
- Delete any existing `data_dir/checkpoints.db`.

## 5. Frontend

- `api/types.ts`: `RunMessage`; `api/client.ts`: `getRunMessages(runId)`; `api/keys.ts`: key entry.
- `AskPanel` ([RunPage.tsx:112](../frontend/src/pages/RunPage.tsx#L112)): replace `useState` thread with `useQuery` on the messages endpoint; on mutation success invalidate that key instead of `setThread`. Thread survives reload.

---

## Notes

- `CLAUDE.md` mentions the `/ask` LangGraph and `checkpoints.db` in the LLM-layer section — update it.
- Trimming to the last 20 messages is the only behavior change; the graph sent unbounded history.
- No migration tooling in the project — `create_all` makes the new table on next start. Existing runs simply start with empty history.
