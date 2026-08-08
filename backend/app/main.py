"""FastAPI application: registers the API routers and serves the built frontend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.app import config
from backend.app.database import SessionLocal, finalize_schema, prepare_schema
from backend.app.routers import attachments, backup, checklist, columns, priorities, settings, tags, tasks
from backend.app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001 - required by FastAPI's lifespan signature
    config.ensure_data_dirs()
    # Split in three steps so seeding can run between adding new columns and
    # dropping legacy ones — some migrations (e.g. task priorities moving
    # from an enum to a table) need seeded rows to backfill into.
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
app.include_router(checklist.router)
app.include_router(attachments.router)
app.include_router(settings.router)
app.include_router(backup.router)


if config.STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(config.STATIC_DIR), html=True), name="static")
