# <img src="frontend/public/favicon.svg" width="32" height="32" valign="middle"> Flowdesk

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Storage-3FCF8E?logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

Flowdesk is a self-hosted Kanban board for tracking your own work. It runs on
your computer in a Docker container and keeps everything in **your own
Supabase project**: the board in Supabase's PostgreSQL database, attachments
and backups in Supabase Storage. Fill in your Supabase details once, start the
container, and your board is always there.

## Features

- Drag-and-drop board with fully customizable columns
- Columns, priorities, task types, and tags each have an icon (Phosphor duotone)
  and a color; pick icons from a searchable library, with a matching color
  suggested automatically, and colors from presets or a full color picker
  (shade area, hue slider, or hex code)
- Tasks with status, type, priority, deadline, tags, checklist, and file
  attachments
- File attachments with one-click download, plus an in-app preview for
  images, PDFs, and text files (TXT, MD, CSV, JSON, LOG)
- Rich-text description and notes, formatted as you type: bold, italic,
  underline, bulleted/numbered lists, and text color (preset swatches, a
  full color picker, or a hex code); Ctrl+click opens links
- One reporter per task (picked from a managed list, or added inline from the
  task) and any number of documentation links (Confluence, Notion, a wiki
  page, ...)
- A reporter manager that shows how many tasks each reporter has, with inline
  rename, search for long lists, a confirmation that states how many tasks
  would be unassigned before deleting, and one-click cleanup of unused
  reporters
- Per-task time tracking: log hours worked with a date and an optional note;
  the running total shows on the card and in the task's detail window
- Move a task between columns by dragging it or from the Status dropdown in
  its detail window
- Task edits are saved only when you press Save; closing with unsaved changes
  asks for confirmation
- Per-column auto-sort by priority or deadline, in either direction
- A statistics page over a preset or custom date range (or all time):
  open/closed tasks, hours logged, trends by day/week/month, and the tasks
  worked on in that range broken down by type, priority, and reporter
- Search and filter by text, priority, tag, type, or reporter
- Draggable, resizable, maximizable task windows
- Light theme by default, with a dark theme you can switch to (remembered)
- JSON backup export/restore stored in your Supabase Storage; an invalid or
  inconsistent backup is rejected without touching your data

## Quick start

You need [Docker](https://www.docker.com/products/docker-desktop/) and a free
[Supabase](https://supabase.com) account; Python and Node.js are only needed
for development.

1. Create a Supabase project and run the two SQL scripts in `supabase/` in its
   SQL Editor.
2. Copy `.env.example` to `.env` and fill in the database connection string,
   the project URL and the secret (service_role) key.
3. Run `docker compose up -d` and open <http://localhost:8000>.

Stop it with `docker compose stop` when you don't need it and bring it back
with `docker compose start`; your data stays in Supabase either way.

The full step-by-step guide is in
**[docs/supabase-setup.md](docs/supabase-setup.md)**. It covers where to find
each value in the Supabase dashboard, everyday commands, using a custom
hostname such as `http://flowdesk.localhost`, importing data from Flowdesk 1.x
(SQLite), backups, and troubleshooting.

## Configuration

All settings are environment variables, read from `.env` (never committed).

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **Session pooler** connection string (`postgresql://...:5432/postgres`) |
| `SUPABASE_URL` | yes | Project URL, e.g. `https://abcdefgh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Secret (`sb_secret_...`) or legacy service_role key; stays on the server |
| `SUPABASE_ATTACHMENTS_BUCKET` | no | Bucket for attachments (default `attachments`) |
| `SUPABASE_BACKUPS_BUCKET` | no | Bucket for JSON backups (default `backups`) |
| `FLOWDESK_PUBLISHED_PORT` | no | Port on your computer (default `8000`) |

The browser never sees the database password or the Supabase keys: only the
Flowdesk server, inside the container, talks to Supabase. Every table has Row
Level Security turned on with no policies and both buckets are private, so the
public Supabase API cannot read your data. The container is published on
`127.0.0.1` only, so other devices on your network cannot reach it.

## Project structure

```
docker-compose.yml         Runs Flowdesk: docker compose up -d
Dockerfile                 Builds the frontend and the backend into one image
.env.example               Template for .env (Supabase connection details)
start.py                   Runs the app without Docker: python start.py
requirements.txt           Backend runtime dependencies
requirements-dev.txt       Runtime dependencies + test and lint tools
supabase/
  01_tables.sql            Tables, indexes and Row Level Security (run in the SQL Editor)
  02_storage.sql           Private storage buckets (run in the SQL Editor)
scripts/
  migrate_sqlite_to_supabase.py   One-time import from Flowdesk 1.x (SQLite)
docs/supabase-setup.md     Step-by-step setup guide
backend/app/
  main.py                  FastAPI app, mounts routers + static files
  config.py                Settings from environment variables / .env
  database.py              Engine/session setup and schema check at startup
  models.py                SQLAlchemy models
  schemas.py               Pydantic request/response schemas
  routers/                 One module per resource (columns, tasks, tags, ...)
  services/                Business logic, Supabase Storage client, JSON backups
  static/                  Built frontend (generated, gitignored)
tests/
  run_all.py               Runs every check and test suite: python tests/run_all.py
  docker-compose.yml       PostgreSQL used by the tests
  e2e_server.py            Starts the app on a fresh database for the browser tests
  backend/                 Backend tests (pytest)
frontend/src/
  api/                     Typed fetch wrappers per resource
  components/              Board, task, stats, layout, and shared UI components
  components/ui/           Small design-system primitives (Button, Badge, Card)
  hooks/                   Reusable stateful logic (async actions, floating panels, ...)
  lib/                     Shared frontend utilities (e.g. `cn` for class merging)
  pages/                   BoardPage, StatsPage, SettingsPage
  state/                   Theme and board-data providers and their hooks
  utils/                   Pure helpers (filters, deadlines, colors, diffs, ...)
frontend/tests/unit/       Frontend unit and component tests (Vitest)
frontend/tests/e2e/        End-to-end tests in a real browser (Playwright)
```

## Development

Requirements: Python 3.12+, Node.js 22.12+, Docker, and Google Chrome (only for
the end-to-end tests).

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS/Linux
pip install -r requirements-dev.txt

cd frontend
npm install
npm run build               # compiles the frontend into backend/app/static/
cd ..

python start.py             # uses the same .env as Docker
```

For live reload, run `uvicorn backend.app.main:app --reload` from the project
root and `npm run dev` from `frontend/`; the Vite dev server proxies `/api` to
`http://127.0.0.1:8000`.

### Icons

The app uses [Phosphor](https://phosphoricons.com) duotone icons, generated
into `frontend/src/icons/phosphor.ts` so only the icons actually used are
shipped. The icons people can pick for columns, priorities, types, and tags are
listed in `frontend/src/icons/catalog.json`. After importing a new icon in the
code or adding one to the catalog, regenerate the module:

```bash
npm run icons                           # from frontend/
```

## Testing

Every part of the app is covered by automated tests, so after any change you
can check that nothing broke with a single command.

| Folder | What it checks | Tool |
| --- | --- | --- |
| `tests/backend/` | Every API endpoint and error case, business rules, statistics, JSON backups, the Supabase Storage client, configuration, the startup schema check, the SQL script matching the models, and the SQLite import | pytest |
| `frontend/tests/unit/` | Helpers, hooks, and UI components (editor, color picker, filters, checklist, time tracking, reporters, ...) | Vitest + Testing Library |
| `frontend/tests/e2e/` | The whole app driven in Chrome, like a user: creating, editing, moving and deleting tasks, rich text, filters, board setup, statistics, settings, backups, theme | Playwright |

The tests never touch your Supabase project. They run against a disposable
PostgreSQL 16 container (`tests/docker-compose.yml`, port 54329, data kept in
memory) and store files in a temporary folder, and they refuse to start if the
test database URL points to Supabase. The frontend tests stay inside
`frontend/` because Vitest and Playwright are configured from there;
`tests/run_all.py` runs both sides together.

The end-to-end tests use the Google Chrome installed on your machine. Without
Chrome, run `npx playwright install chromium` once and set
`FLOWDESK_BROWSER_CHANNEL=chromium`.

### Run everything

From the project root, with Docker running:

```bash
python tests/run_all.py              # starts the test PostgreSQL, then lint, type-check, build, and all suites
python tests/run_all.py --skip-e2e   # same, without the (slower) browser tests
python tests/run_all.py --keep-db    # leave the test PostgreSQL running afterwards
```

It prints a PASS/FAIL summary and exits with an error if any step fails.

### Run a single part

```bash
# backend (from the project root)
docker compose -f tests/docker-compose.yml up -d --wait   # start the test PostgreSQL
pytest                                   # all backend tests, with coverage (fails below 90%)
pytest tests/backend/test_tasks.py -k doc_urls   # one file / matching tests
ruff check backend scripts start.py tests        # lint
ruff format backend scripts start.py tests       # formatting
docker compose -f tests/docker-compose.yml down          # stop it

# frontend (from frontend/)
npm test                                 # unit and component tests
npm run test:watch                       # re-run tests on every save
npm run test:coverage                    # coverage report in frontend/coverage/
npm run test:e2e                         # build, then end-to-end tests in Chrome (needs the test PostgreSQL)
npx playwright test --headed             # watch the browser while the e2e tests run
npx playwright test --trace on           # record a step-by-step trace (for debugging)
npx playwright show-report               # open the last end-to-end report
npm run lint                             # lint
npm run build                            # type-check and build
```
