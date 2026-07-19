from fastapi import FastAPI

from api.routes.jobs import router as jobs_router
from api.routes.resume import router as resume_router
from api.routes.runs import router as runs_router


def setup_routes(app: FastAPI) -> None:
    app.include_router(resume_router)
    app.include_router(runs_router)
    app.include_router(jobs_router)
