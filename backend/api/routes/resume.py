import re
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_db, get_document_parser, get_llm_service, get_settings
from configs.settings import AppSettings
from models.resume import Resume
from schemas import ResumeRead
from services import DocumentParser, LLMService

router = APIRouter(prefix="/api/resume", tags=["Resume"])


def _build_stored_filename(original: str) -> str:
    stem = re.sub(r"[^\w-]", "_", Path(original).stem)[:80]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{stem}_{timestamp}{Path(original).suffix.lower()}"


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"message": "OK"}

# TODO: Add pagination
@router.get("")
async def list_resumes(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ResumeRead]:
    result = await db.execute(select(Resume).order_by(Resume.created_at.desc()))
    resumes = result.scalars().all()
    return [ResumeRead.model_validate(resume) for resume in resumes]


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile,
    settings: Annotated[AppSettings, Depends(get_settings)],
    db: Annotated[AsyncSession, Depends(get_db)],
    llm: Annotated[LLMService, Depends(get_llm_service)],
    parser: Annotated[DocumentParser, Depends(get_document_parser)],
) -> ResumeRead:
    if not file.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing filename")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in settings.allowed_resume_extensions:
        allowed = ", ".join(sorted(settings.allowed_resume_extensions))
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type '{suffix}', expected one of: {allowed}",
        )

    content = await file.read(settings.max_upload_bytes + 1)
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the {settings.max_upload_bytes} byte limit",
        )

    file_path = settings.data_dir / _build_stored_filename(file.filename)
    file_path.write_bytes(content)

    try:
        if suffix == ".docx":
            text = parser.extract_docx_text(file_path)
            if len(text) > settings.max_docx_chars:
                raise HTTPException(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    f"Document text exceeds the {settings.max_docx_chars} character limit",
                )
            parsed = await llm.extract_resume_from_text(text)
        else:
            parsed = await llm.extract_resume(file_path)
        parsed_json = parsed.model_dump() if parsed else None

        resume = Resume(filename=file_path.name, parsed_json=parsed_json)
        db.add(resume)
        await db.commit()
        await db.refresh(resume)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise

    return ResumeRead.model_validate(resume)
