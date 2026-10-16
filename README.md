# <img src="frontend/public/favicon.svg" width="32" height="32" valign="middle"> Flowdesk

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?logo=sqlite&logoColor=white)

Flowdesk is a local-only, self-hosted Kanban board for tracking your own
work. It runs entirely on your machine, with no accounts and no cloud, and
stores everything in a single SQLite file.

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
- Manual backup export/restore (older backups are upgraded on restore, and a
  file that is not a valid Flowdesk database is rejected without touching your
  data)

## Project structure

```
start.py                   Starts the app: python start.py
requirements.txt           Backend dependencies
backend/app/
  main.py                  FastAPI app, mounts routers + static files
  models.py                SQLAlchemy models
  schemas.py               Pydantic request/response schemas
  database.py              Engine/session setup, additive schema sync, data migrations
  routers/                 One module per resource (columns, tasks, tags, ...)
  services/                Business logic used by the routers
  static/                  Built frontend (generated, gitignored)
tests/
  run_all.py               Runs every check and test suite: python tests/run_all.py
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
data/                      SQLite database, backups, attachments (gitignored)
```

## Requirements

- Python 3.12+
- Node.js 20+ (build-time only; not required to run the app)
- Google Chrome (only for the end-to-end tests)

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

cd frontend
npm install
npm run build
cd ..
```

`npm run build` compiles the frontend into `backend/app/static/`, served
directly by FastAPI. This is a one-time (or per-update) step.

## Running

```bash
python start.py
```

Starts the server at `http://127.0.0.1:8000` and opens it in your browser.
It binds to `127.0.0.1` only — never reachable from other devices.

## Data & backups

All data lives in `data/`, excluded from git:

- `data/flowdesk.db` — the SQLite database
- `data/backups/` — backups exported from the Settings page
- `data/attachments/` — files uploaded to tasks

## Development

```bash
uvicorn backend.app.main:app --reload   # backend, auto-reload
npm run dev                             # frontend dev server (from frontend/)
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

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
| `tests/backend/` | Every API endpoint, error case, business rule, statistics, backups, and database upgrades from older versions | pytest |
| `frontend/tests/unit/` | Helpers, hooks, and UI components (editor, color picker, filters, checklist, time tracking, ...) | Vitest + Testing Library |
| `frontend/tests/e2e/` | The whole app driven in Chrome, like a user: creating, editing, moving and deleting tasks, rich text, filters, board setup, statistics, settings, backups, theme | Playwright |

The frontend tests stay inside `frontend/` because Vitest and Playwright are
configured from there; `tests/run_all.py` runs both sides together.

The tests never touch your data: backend tests use a temporary database, and
the end-to-end tests start their own server on port 8765 with a temporary
`data/` folder, so the app on port 8000 can stay open while they run.

### One-time setup

```bash
pip install -r requirements.txt
cd frontend
npm install
```

The end-to-end tests use the Google Chrome installed on your machine. Without
Chrome, run `npx playwright install chromium` once and set
`FLOWDESK_BROWSER_CHANNEL=chromium`.

### Run everything

From the project root:

```bash
python tests/run_all.py              # lint, type-check, build, and all test suites
python tests/run_all.py --skip-e2e   # same, without the (slower) browser tests
```

It prints a PASS/FAIL summary and exits with an error if any step fails.

### Run a single part

```bash
# backend (from the project root)
pytest                                   # all backend tests, with coverage (fails below 90%)
pytest tests/backend/test_tasks.py -k doc_urls   # one file / matching tests
ruff check backend start.py tests        # lint
ruff format backend start.py tests       # formatting

# frontend (from frontend/)
npm test                                 # unit and component tests
npm run test:watch                       # re-run tests on every save
npm run test:coverage                    # coverage report in frontend/coverage/
npm run test:e2e                         # build, then end-to-end tests in Chrome
npx playwright test --headed             # watch the browser while the e2e tests run
npx playwright test --trace on           # record a step-by-step trace (for debugging)
npx playwright show-report               # open the last end-to-end report
npm run lint                             # lint
npm run build                            # type-check and build
```
