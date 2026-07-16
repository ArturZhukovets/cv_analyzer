from fastapi import FastAPI

from api.routes.resume import router as resume_router


def setup_routes(app: FastAPI) -> None:
    app.include_router(resume_router)
