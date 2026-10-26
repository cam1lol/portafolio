-- Project detail page: featured flag, fact sheet, results, screens, gallery, planned improvements,
-- documents and version history. Everything is optional (empty by default) and files live in the
-- repo under public/media/projects/<slug>/, so these columns only hold paths and short texts.
-- Safe to re-run.

alter table projects add column if not exists featured boolean not null default false;
alter table projects add column if not exists facts jsonb not null default '{}'::jsonb;
alter table projects add column if not exists results jsonb not null default '[]'::jsonb;
alter table projects add column if not exists screens jsonb not null default '[]'::jsonb;
alter table projects add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table projects add column if not exists improvements jsonb not null default '[]'::jsonb;
alter table projects add column if not exists docs jsonb not null default '[]'::jsonb;
alter table projects add column if not exists versions jsonb not null default '[]'::jsonb;

-- Shape and size guards: facts is an object, the rest are lists, and none can grow past ~64 KB
-- (plenty for text and paths; stops a runaway payload from bloating the row).
alter table projects drop constraint if exists projects_details_shape;
alter table projects add constraint projects_details_shape check (
  jsonb_typeof(facts) = 'object'
  and jsonb_typeof(results) = 'array'
  and jsonb_typeof(screens) = 'array'
  and jsonb_typeof(gallery) = 'array'
  and jsonb_typeof(improvements) = 'array'
  and jsonb_typeof(docs) = 'array'
  and jsonb_typeof(versions) = 'array'
);

alter table projects drop constraint if exists projects_details_size;
alter table projects add constraint projects_details_size check (
  pg_column_size(facts) <= 65536
  and pg_column_size(results) <= 65536
  and pg_column_size(screens) <= 65536
  and pg_column_size(gallery) <= 65536
  and pg_column_size(improvements) <= 65536
  and pg_column_size(docs) <= 65536
  and pg_column_size(versions) <= 65536
);
