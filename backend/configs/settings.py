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

    # --- File Storage ---
    data_dir: Path = BASE_DIR / "data"
    max_upload_bytes: int = 5 * 1024 * 1024   # 5MB
    allowed_resume_extensions: set[str] = {".pdf", ".docx"}


settings = AppSettings()

settings.data_dir.mkdir(parents=True, exist_ok=True)
