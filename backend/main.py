import uvicorn
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.routes import setup_routes
from app import App
from configs.settings import AppSettings, settings


def create_app(app_settings: AppSettings = settings) -> App:
    engine = create_async_engine(
        app_settings.database_url,
        echo=app_settings.db_echo,
    )
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    app = App(
        app_settings=app_settings,
        db_engine=engine,
        db_session_maker=session_maker,
    )
    setup_routes(app)
    return app


app = create_app()


def main() -> None:
    uvicorn.run("main:app", reload=settings.dev_mode)


if __name__ == "__main__":
    main()
