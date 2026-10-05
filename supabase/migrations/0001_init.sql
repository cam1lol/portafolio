create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('web','3d','tool')),
  kind text not null check (kind in ('front','back')),
  device text check (device in ('browser','phone')),
  status text not null check (status in ('live','wip','archive')),
  icon text not null,
  type_label text not null,
  summary_es text not null,
  summary_en text not null,
  long_es text not null,
  long_en text not null,
  highlights_es text[] not null default '{}',
  highlights_en text[] not null default '{}',
  stack text[] not null default '{}',
  preview_image text,
  repo_url text,
  live_url text,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists experience (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_es text not null,
  role_en text not null,
  period_es text not null,
  period_en text not null,
  tag_es text not null,
  tag_en text not null,
  is_current boolean not null default false,
  summary_es text not null,
  summary_en text not null,
  points_es text[] not null default '{}',
  points_en text[] not null default '{}',
  stack text[] not null default '{}',
  subprojects jsonb,
  sort_order int not null default 0,
  published boolean not null default true
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  lang text not null,
  body text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists section_visibility (
  section text primary key,
  visible boolean not null default true
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hero','card_grid','roadmap','text','gallery_3d')),
  page text not null,
  config jsonb not null default '{}',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Single-owner admin allowlist. Starts EMPTY on purpose: nobody (not even a
-- freshly authenticated user) gets admin access until the owner's own
-- auth.users id is inserted here manually, once that account exists (Phase 4).
-- RLS is enabled with no policies for anon/authenticated, so the table is
-- unreachable directly via the API; it's only readable through is_admin()
-- below, which runs as security definer (bypasses RLS on this one table only).
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admins enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant execute on function is_admin() to anon, authenticated;

alter table projects enable row level security;
alter table experience enable row level security;
alter table comments enable row level security;
alter table section_visibility enable row level security;
alter table visits enable row level security;
alter table blocks enable row level security;

-- Every policy is dropped-then-created so this whole file can be re-run
-- safely from scratch at any point (Postgres has no "create policy if not
-- exists"), regardless of which earlier version of it was already applied.
drop policy if exists "projects_public_read" on projects;
create policy "projects_public_read" on projects for select using (published = true);
drop policy if exists "projects_admin_all" on projects;
create policy "projects_admin_all" on projects for all using (is_admin()) with check (is_admin());

drop policy if exists "experience_public_read" on experience;
create policy "experience_public_read" on experience for select using (published = true);
drop policy if exists "experience_admin_all" on experience;
create policy "experience_admin_all" on experience for all using (is_admin()) with check (is_admin());

drop policy if exists "comments_public_read_approved" on comments;
create policy "comments_public_read_approved" on comments for select using (approved = true);
drop policy if exists "comments_public_insert" on comments;
create policy "comments_public_insert" on comments for insert with check (true);
drop policy if exists "comments_admin_all" on comments;
create policy "comments_admin_all" on comments for all using (is_admin()) with check (is_admin());

drop policy if exists "section_visibility_public_read" on section_visibility;
create policy "section_visibility_public_read" on section_visibility for select using (true);
drop policy if exists "section_visibility_admin_update" on section_visibility;
create policy "section_visibility_admin_update" on section_visibility for update using (is_admin()) with check (is_admin());

drop policy if exists "visits_public_insert" on visits;
create policy "visits_public_insert" on visits for insert with check (true);
drop policy if exists "visits_admin_read" on visits;
create policy "visits_admin_read" on visits for select using (is_admin());

drop policy if exists "blocks_public_read" on blocks;
create policy "blocks_public_read" on blocks for select using (published = true);
drop policy if exists "blocks_admin_all" on blocks;
create policy "blocks_admin_all" on blocks for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('previews', 'previews', true)
on conflict (id) do nothing;

drop policy if exists "previews_public_read" on storage.objects;
create policy "previews_public_read" on storage.objects for select using (bucket_id = 'previews');
drop policy if exists "previews_admin_write" on storage.objects;
create policy "previews_admin_write" on storage.objects for insert with check (bucket_id = 'previews' and is_admin());
drop policy if exists "previews_admin_update" on storage.objects;
create policy "previews_admin_update" on storage.objects for update using (bucket_id = 'previews' and is_admin());
drop policy if exists "previews_admin_delete" on storage.objects;
create policy "previews_admin_delete" on storage.objects for delete using (bucket_id = 'previews' and is_admin());
