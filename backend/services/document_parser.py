from pathlib import Path

from docx import Document


class DocumentParser:

    def extract_docx_text(self, file_path: Path) -> str:
        """Extracts transient plain text from uploaded DOCX files (python-docx)."""
        document = Document(str(file_path))
        parts = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                parts.append("\t".join(cell.text for cell in row.cells))
        return "\n".join(part for part in parts if part.strip())
