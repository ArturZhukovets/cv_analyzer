from pathlib import Path


PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"

PARSE_CV_PROMPT = (PROMPTS_DIR / "parse_cv.md")
ANALYZE_JOB_PROMPT = (PROMPTS_DIR / "analyze_job.md")
ASK_RUN_PROMPT = (PROMPTS_DIR / "ask_run.md")
COVER_LETTER_PROMPT = (PROMPTS_DIR / "cover_letter.md")
