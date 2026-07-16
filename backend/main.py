import uvicorn

from app import create_app
from configs.settings import settings

app = create_app()


def main() -> None:
    uvicorn.run("main:app", reload=settings.dev_mode)


if __name__ == "__main__":
    main()
