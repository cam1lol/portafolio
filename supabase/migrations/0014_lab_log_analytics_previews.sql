-- Laboratorio, Bitácora, analytics per project and private draft previews. Run after 0013.
-- Safe to re-run: tables, policies and functions are idempotent and seeds never overwrite edits.

-- ---------------------------------------------------------------------------
-- Laboratorio: short experiments, each a looping clip (files under public/media/projects/lab/).
-- ---------------------------------------------------------------------------

create table if not exists lab_items (
  id uuid primary key default gen_random_uuid(),
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null default '' check (char_length(title_en) <= 120),
  description_es text not null default '' check (char_length(description_es) <= 600),
  description_en text not null default '' check (char_length(description_en) <= 600),
  video text not null check (char_length(video) between 1 and 500),
  poster text not null default '' check (char_length(poster) <= 2000),
  tags text not null default '' check (char_length(tags) <= 200),
  url text not null default '' check (char_length(url) <= 2000 and (url = '' or url ~ '^https?://')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bitácora: short dated notes shown as a HUD log on the home page.
-- ---------------------------------------------------------------------------

create table if not exists log_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note' check (kind in ('now', 'launch', 'learning', 'note')),
  entry_date date not null default current_date,
  text_es text not null check (char_length(text_es) between 1 and 280),
  text_en text not null default '' check (char_length(text_en) <= 280),
  url text not null default '' check (char_length(url) <= 2000 and (url = '' or url ~ '^https?://')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table lab_items enable row level security;
alter table log_entries enable row level security;

drop policy if exists "lab_items_public_read" on lab_items;
create policy "lab_items_public_read" on lab_items for select using (published = true);
drop policy if exists "lab_items_admin_all" on lab_items;
create policy "lab_items_admin_all" on lab_items for all using (is_admin()) with check (is_admin());

drop policy if exists "log_entries_public_read" on log_entries;
create policy "log_entries_public_read" on log_entries for select using (published = true);
drop policy if exists "log_entries_admin_all" on log_entries;
create policy "log_entries_admin_all" on log_entries for all using (is_admin()) with check (is_admin());

-- Home sections: visibility switches and a default place (lab after clients, log after roadmap).
insert into section_visibility (section, visible)
values ('lab', true), ('log', true)
on conflict (section) do nothing;

do $$
declare
  pair text[];
  anchor_order integer;
begin
  foreach pair slice 1 in array array[['lab', 'clients'], ['log', 'roadmap']] loop
    if exists (select 1 from page_items where item_key = 'section:' || pair[1]) then
      continue;
    end if;

    select sort_order into anchor_order from page_items where item_key = 'section:' || pair[2];
    if anchor_order is null then
      select coalesce(max(sort_order) + 1, 0) into anchor_order from page_items where page = 'home';
    else
      anchor_order := anchor_order + 1;
      update page_items set sort_order = sort_order + 1 where page = 'home' and sort_order >= anchor_order;
    end if;

    insert into page_items (item_key, page, item_type, section_key, sort_order)
    values ('section:' || pair[1], 'home', 'section', pair[1], anchor_order);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Analytics per project: one row per project page view, written when the visitor leaves the page
-- with how far down they read. Anonymous visitors can only insert well-formed rows; only the
-- admin can read them. No personal data: slug, language, depth and time.
-- ---------------------------------------------------------------------------

create table if not exists project_views (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{1,80}$'),
  lang text not null default 'es' check (lang in ('es', 'en')),
  depth smallint not null default 0 check (depth between 0 and 100),
  seconds int not null default 0 check (seconds between 0 and 86400),
  created_at timestamptz not null default now()
);

create index if not exists project_views_created_idx on project_views (created_at desc);

alter table project_views enable row level security;

drop policy if exists "project_views_public_insert" on project_views;
create policy "project_views_public_insert" on project_views for insert to anon, authenticated with check (true);
drop policy if exists "project_views_admin_read" on project_views;
create policy "project_views_admin_read" on project_views for select using (is_admin());
drop policy if exists "project_views_admin_delete" on project_views;
create policy "project_views_admin_delete" on project_views for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- Private draft previews: each project has a secret token; /proyectos/<slug>?preview=<token>
-- shows it even while unpublished. The function only returns the row when the token matches.
-- ---------------------------------------------------------------------------

alter table projects add column if not exists preview_token uuid not null default gen_random_uuid();

create or replace function project_preview(p_slug text, p_token uuid)
returns setof projects
language sql
stable
security definer
set search_path = public
as $$
  select * from projects where slug = p_slug and preview_token = p_token limit 1;
$$;

revoke all on function project_preview(text, uuid) from public;
grant execute on function project_preview(text, uuid) to anon, authenticated;
