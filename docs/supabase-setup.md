# Setting up Flowdesk with Supabase

Flowdesk keeps its data in **your own Supabase project**: the board lives in Supabase's
PostgreSQL database and attachments and backups live in Supabase Storage. Flowdesk itself
runs on your computer in a Docker container. This guide takes about 10 minutes and is only
needed once.

You need:

- A free [Supabase](https://supabase.com) account
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine with the Compose plugin (Linux)
- This repository on your computer (`git clone` or download the ZIP)

## 1. Create a Supabase project

1. Sign in to the Supabase Dashboard and click **New project**.
2. Choose a name (e.g. `flowdesk`), a **database password** and the region closest to you.
   Save the password somewhere safe: you will need it in step 4 and Supabase will not show it again
   (you can reset it under **Project Settings → Database**).
3. Wait until the project has finished provisioning.

## 2. Create the tables

1. Open **SQL Editor** in the left sidebar and click **New query**.
2. Open [`supabase/01_tables.sql`](../supabase/01_tables.sql) from this repository, copy its whole
   content, paste it into the editor and click **Run**. It should end with "Success. No rows returned".
3. Open **Table Editor**: you should see the tables `columns`, `tasks`, `tags`, `reporters`,
   `priorities`, `task_types`, `task_tags`, `task_doc_links`, `checklist_items`, `attachments`,
   `time_entries` and `settings`. They are empty for now; Flowdesk fills in the default columns,
   priorities and task types the first time it starts.

The script turns on **Row Level Security** on every table without adding any policy. This is
intentional: it blocks the public Supabase API (anon/publishable key), so your data can only be
reached through Flowdesk's own server connection. Do not add policies unless you know you need them.

## 3. Create the storage buckets

1. Back in **SQL Editor**, open a **New query**.
2. Paste the content of [`supabase/02_storage.sql`](../supabase/02_storage.sql) and click **Run**.
3. Open **Storage**: you should see two **private** buckets, `attachments` and `backups`.

If you prefer the UI, you can instead create the two buckets by hand under **Storage → New bucket**:
same names, **Public bucket turned off**.

## 4. Collect the connection details

You need three values.

| Setting in `.env` | Where to find it |
| --- | --- |
| `DATABASE_URL` | Click **Connect** at the top of the dashboard → **Connection String** → choose **Session pooler** → copy the URI. |
| `SUPABASE_URL` | **Project Settings → Data API** (or **API**): the **Project URL**, e.g. `https://abcdefgh.supabase.co`, with nothing after `.co` (not the `.../rest/v1/` API URL). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings → API Keys**: a **secret** key (`sb_secret_...`), or the legacy **service_role** key. |

Notes on the connection string:

- Use the **Session pooler** URI (port `5432`, host like `aws-0-<region>.pooler.supabase.com`).
  The "Direct connection" host only works over IPv6, which most home networks and Docker Desktop
  do not provide. The Transaction pooler (port `6543`) also works.
- Replace `[YOUR-PASSWORD]` with the database password from step 1. If the password contains
  special characters, URL-encode them: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`,
  `#` → `%23`, `%` → `%25`. Or choose a password with letters and digits only.

The secret / service_role key gives full access to your project: keep it private and never put it
in the browser, in a screenshot or in git.

## 5. Configure Flowdesk

In the project folder, copy the template and fill it in:

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` in a text editor and set `DATABASE_URL`, `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. Leave the bucket names as they are unless you renamed the buckets.
`.env` is ignored by git, so it never ends up in a commit.

## 6. Start Flowdesk

```bash
docker compose up -d
```

The first time, this builds the Flowdesk image automatically (a few minutes); later starts reuse
it and take a few seconds. Then open <http://localhost:8000>.

- The container restarts automatically with Docker, so after this step Flowdesk is simply there
  whenever Docker is running.
- To use another port on your computer, set `FLOWDESK_PUBLISHED_PORT` in `.env`.
- Flowdesk is published on `127.0.0.1` only: other devices on your network cannot reach it.
- After pulling a new version of Flowdesk, run `docker compose up -d --build`: `--build` is only
  needed then, to rebuild the image with the new code.

## Everyday commands

Run them from the project folder. Your data is in Supabase, so stopping or removing the container
never deletes anything.

| What | Command |
| --- | --- |
| Stop Flowdesk when you don't need it | `docker compose stop` |
| Start it again | `docker compose start` |
| Stop and remove the container (it is recreated on the next `up`) | `docker compose down` |
| Start after a `down`, or after changing `.env` | `docker compose up -d` |
| Update to a new version of Flowdesk | `git pull`, then `docker compose up -d --build` |
| See whether it is running | `docker compose ps` |
| Follow the logs | `docker compose logs -f` |

`stop` keeps the container, so `start` brings it back instantly. A stopped container also stays
stopped when Docker restarts; run `docker compose start` (or `up -d`) to bring it back. After you
edit `.env`, use `docker compose up -d`: `start` would keep the old settings.

## Using a custom hostname

Flowdesk answers on any name that points to your own computer, so you can replace
`localhost:8000` with something friendlier. Flowdesk stays reachable from this computer only.

- **No setup needed:** every name ending in `.localhost` points to your computer in Chrome, Edge
  and Firefox, so <http://flowdesk.localhost:8000> works right away.
- **Without the port number:** set `FLOWDESK_PUBLISHED_PORT=80` in `.env` and run
  `docker compose up -d`. Then open <http://flowdesk.localhost>. Port 80 must not be used by
  another program (such as IIS or another web server).
- **A completely custom name** such as `http://flowdesk/`: add this line to your hosts file,
  which needs administrator rights.

  ```
  127.0.0.1   flowdesk
  ```

  On Windows the file is `C:\Windows\System32\drivers\etc\hosts` (open Notepad with "Run as
  administrator"); on macOS and Linux it is `/etc/hosts` (`sudo nano /etc/hosts`). Avoid names
  ending in `.local`: macOS reserves them for network discovery and they can load slowly.

## Moving existing data from Flowdesk 1.x (SQLite)

If you used an earlier version, your board is in `data/flowdesk.db` and your attachments in
`data/attachments/`. After steps 1–5, import them once:

```bash
docker compose run --rm -v "./data:/import" flowdesk \
  python -m scripts.migrate_sqlite_to_supabase --sqlite /import/flowdesk.db --attachments /import/attachments
```

Or, with a local Python environment (`pip install -r requirements.txt`):

```bash
python -m scripts.migrate_sqlite_to_supabase --sqlite data/flowdesk.db --attachments data/attachments
```

- Add `--dry-run` first to see what would be imported without writing anything.
- The import keeps every id and task code (FD-12 stays FD-12) and uploads the attachment files.
- If the Supabase database already contains tasks, tags or reporters, the script stops; add
  `--force` to replace them with the SQLite data.
- Databases from versions older than 1.3 must be opened once with Flowdesk **v1.3**
  (`git checkout v1.3`, `python start.py`) so they are upgraded, before importing.
- Old `.db` backups from 1.x cannot be restored in 2.x: import the database instead.

## Backups

**Settings → Backups → Export backup now** saves a JSON copy of all board data into the private
`backups` bucket; from the same page you can download or restore it. Restoring replaces all
current data and is checked before anything is changed: an invalid or inconsistent file is
rejected and your data stays as it was.

Attachment files are **not** inside the JSON: they stay in the `attachments` bucket. Supabase also
keeps its own daily database backups on paid plans (**Database → Backups**).

## Troubleshooting

| Message or symptom | Fix |
| --- | --- |
| `Missing required settings: ...` | `.env` is missing or incomplete. Check the names listed in the message. |
| `The database has no Flowdesk tables yet` or `The database is missing ...` | Run `supabase/01_tables.sql` (step 2). After a Flowdesk update, run it again: it only adds what is missing. |
| `password authentication failed` | Wrong password in `DATABASE_URL`, or special characters not URL-encoded. |
| `could not translate host name` / `Network is unreachable` | You are using the Direct connection string; switch to the **Session pooler** one. |
| Uploads or backups fail with `Supabase Storage ... failed (404)` / `Bucket not found` | Run `supabase/02_storage.sql` (step 3), or check `SUPABASE_ATTACHMENTS_BUCKET` / `SUPABASE_BACKUPS_BUCKET`. |
| `Supabase Storage ... failed (404): Invalid path specified in request URL` | `SUPABASE_URL` is not the Project URL. Use `https://<ref>.supabase.co` with no extra path (Flowdesk 2.0+ also strips a trailing `/rest/v1` automatically). |
| `Supabase Storage ... failed (401/403)` | `SUPABASE_SERVICE_ROLE_KEY` is not the secret/service_role key (the publishable/anon key is not enough). |
| The app stopped working after some days of inactivity | Free Supabase projects are paused after about a week without activity. Open the project in the dashboard and click **Restore project**. |
| Port 8000 already in use | Set `FLOWDESK_PUBLISHED_PORT=8001` in `.env` and run `docker compose up -d`. |
