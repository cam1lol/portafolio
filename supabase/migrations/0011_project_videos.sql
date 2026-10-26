-- Project videos section: any number of videos per project, each with title, description,
-- file, poster and duration (files live in the repo under public/media/projects/<slug>/).
-- Run after 0010. Safe to re-run.

alter table projects add column if not exists videos jsonb not null default '[]'::jsonb;

alter table projects drop constraint if exists projects_videos_shape;
alter table projects add constraint projects_videos_shape check (
  jsonb_typeof(videos) = 'array' and pg_column_size(videos) <= 65536
);
