from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class AppSettings(BaseSettings):
    """Application configuration, loaded from environment / the .env file."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "Career Intelligence Assistant"
    app_version: str = "0.1.0"
    dev_mode: bool = False

    # --- Database ---
    database_url: str = "sqlite+aiosqlite:///./cv_analyzer.db"
    db_echo: bool = False

    # --- LLM ---
    # `provider:model` strings feed init_chat_model directly (the multi-provider seam).
    # Fast tier: extraction/adjudication; strong tier: narrative judgment.
    llm_fast_model: str = "openai:gpt-5.4-mini"
    llm_strong_model: str = "openai:gpt-5.4"
    llm_max_concurrency: int = 4
    llm_max_retries: int = 2
    llm_timeout_s: float = 120.0
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    # --- File Storage ---
    data_dir: Path = BASE_DIR / "data"
    max_upload_bytes: int = 5 * 1024 * 1024   # 5MB
    max_docx_chars: int = 30_000
    allowed_resume_extensions: set[str] = {".pdf", ".docx"}


settings = AppSettings()

settings.data_dir.mkdir(parents=True, exist_ok=True)
