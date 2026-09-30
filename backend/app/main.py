from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.app import config
from backend.app.database import SessionLocal, finalize_schema, prepare_schema
from backend.app.routers import (
    attachments,
    backup,
    checklist,
    columns,
    priorities,
    reporters,
    settings,
    stats,
    tags,
    task_types,
    tasks,
    time_entries,
)
from backend.app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001 - required by FastAPI's lifespan signature
    config.ensure_data_dirs()
    prepare_schema()
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    finalize_schema()
    yield


app = FastAPI(title="Flowdesk API", lifespan=lifespan)

app.include_router(columns.router)
app.include_router(tasks.router)
app.include_router(tags.router)
app.include_router(priorities.router)
app.include_router(task_types.router)
app.include_router(reporters.router)
app.include_router(checklist.router)
app.include_router(time_entries.router)
app.include_router(attachments.router)
app.include_router(settings.router)
app.include_router(backup.router)
app.include_router(stats.router)


if config.STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(config.STATIC_DIR), html=True), name="static")
