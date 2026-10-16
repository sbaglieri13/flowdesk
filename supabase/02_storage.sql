-- Flowdesk storage buckets.
-- Run once in the Supabase SQL Editor, after 01_tables.sql.
-- Both buckets are private: files are only reachable through the Flowdesk server,
-- which uses the service_role key. Safe to run again.
-- If you change SUPABASE_ATTACHMENTS_BUCKET or SUPABASE_BACKUPS_BUCKET in .env,
-- use the same names here.

insert into storage.buckets (id, name, public, file_size_limit)
values
    ('attachments', 'attachments', false, 26214400),
    ('backups', 'backups', false, null)
on conflict (id) do update set public = false;
