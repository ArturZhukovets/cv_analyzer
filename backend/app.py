from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Final

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from configs.settings import AppSettings
from database import DatabaseManager
from models import Base
from services import DocumentParser, LLMService


@asynccontextmanager
async def lifespan(app: "App") -> AsyncGenerator[None, None]:
    async with app.db_manager.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await app.db_manager.close()


class App(FastAPI):
    def __init__(
        self,
        app_settings: AppSettings,
        db_engine: AsyncEngine,
        db_session_maker: async_sessionmaker[AsyncSession],
    ) -> None:
        self.app_settings: Final = app_settings
        self.db_manager: Final = DatabaseManager(db_engine, db_session_maker)
        self.llm_service: Final = LLMService(app_settings)
        self.document_parser: Final = DocumentParser()

        super().__init__(
            debug=app_settings.dev_mode,
            title=app_settings.app_name,
            version=app_settings.app_version,
            lifespan=lifespan,
        )
