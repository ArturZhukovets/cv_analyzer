from pathlib import Path


class DocumentParser:
    """Parses an uploaded PDF/DOCX into transient plain text (pypdf / python-docx).

    The text feeds LLM extraction and is discarded — never persisted.
    """

    def extract_text(self, file_path: Path) -> str | None:
        pass
