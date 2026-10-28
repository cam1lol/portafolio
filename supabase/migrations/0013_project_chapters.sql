-- Case study chapters: an ordered list of editorial pieces per project (text, image, before/after,
-- quote, code, 3D model), composed from the admin and shown on the project page. Same pattern as
-- `videos` (0011): a jsonb array on `projects`, so it inherits the projects RLS (anon reads only
-- published rows). Run after 0012. Safe to re-run.

alter table projects add column if not exists chapters jsonb not null default '[]'::jsonb;

alter table projects drop constraint if exists projects_chapters_shape;
alter table projects add constraint projects_chapters_shape check (
  jsonb_typeof(chapters) = 'array' and pg_column_size(chapters) <= 262144
);
