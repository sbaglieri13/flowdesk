"""Start Flowdesk for the Playwright tests on a freshly created PostgreSQL database."""

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_URL = "postgresql+psycopg://flowdesk:flowdesk@127.0.0.1:54329/flowdesk_e2e"


def reset_database(url: str) -> None:
    target = make_url(url)
    if "supabase" in (target.host or ""):
        sys.exit("Refusing to reset a Supabase database for the end-to-end tests.")

    admin = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": target.database}
        ).first()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin.dispose()

    engine = create_engine(target)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.exec_driver_sql((ROOT / "supabase" / "01_tables.sql").read_text(encoding="utf-8"))
    engine.dispose()


def main() -> None:
    url = os.environ.get("FLOWDESK_E2E_DATABASE_URL", DEFAULT_URL)
    reset_database(url)
    os.environ["DATABASE_URL"] = url

    import uvicorn

    from backend.app.config import settings
    from backend.app.main import app

    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
