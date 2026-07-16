from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app import App
from configs.settings import AppSettings
from services import DocumentParser, LLMService


def get_app(request: Request) -> App:
    return request.app


def get_settings(request: Request) -> AppSettings:
    return request.app.app_settings


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    async with request.app.db_manager.connect() as session:
        yield session


def get_llm_service(request: Request) -> LLMService:
    return request.app.llm_service


def get_document_parser(request: Request) -> DocumentParser:
    return request.app.document_parser
