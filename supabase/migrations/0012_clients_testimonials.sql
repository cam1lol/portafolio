-- Home "block 1": client logos, testimonials and the CV PDFs uploaded from the admin.
-- Availability and CV links live in site_content (keys availability_state, availability_text, cv_url),
-- so they need no schema change. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables (same pattern as services / roadmap_items in 0005)
-- ---------------------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- Public URL of the logo in the previews bucket (uploaded from the admin).
  logo text not null default '' check (char_length(logo) <= 2000),
  url text not null default '' check (char_length(url) <= 2000 and (url = '' or url ~ '^https?://')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  quote_es text not null check (char_length(quote_es) between 1 and 600),
  -- English is optional: the site falls back to the Spanish quote.
  quote_en text not null default '' check (char_length(quote_en) <= 600),
  author text not null check (char_length(author) between 1 and 80),
  role_es text not null default '' check (char_length(role_es) <= 120),
  role_en text not null default '' check (char_length(role_en) <= 120),
  company text not null default '' check (char_length(company) <= 80),
  photo text not null default '' check (char_length(photo) <= 2000),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: public reads published rows, only is_admin() writes.
-- ---------------------------------------------------------------------------

alter table clients enable row level security;
alter table testimonials enable row level security;

drop policy if exists "clients_public_read" on clients;
create policy "clients_public_read" on clients for select using (published = true);
drop policy if exists "clients_admin_all" on clients;
create policy "clients_admin_all" on clients for all using (is_admin()) with check (is_admin());

drop policy if exists "testimonials_public_read" on testimonials;
create policy "testimonials_public_read" on testimonials for select using (published = true);
drop policy if exists "testimonials_admin_all" on testimonials;
create policy "testimonials_admin_all" on testimonials for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Home sections: visibility switches and a default place in the layout (once each).
-- Logos go right after projects, testimonials right after experience.
-- ---------------------------------------------------------------------------

insert into section_visibility (section, visible)
values ('clients', true), ('testimonials', true)
on conflict (section) do nothing;

do $$
declare
  pair text[];
  anchor_order integer;
begin
  foreach pair slice 1 in array array[['clients', 'projects'], ['testimonials', 'experience']] loop
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
-- Storage: public bucket for the CV (PDF only, up to 10 MB), admin-only writes.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', true, 10485760, array['application/pdf']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents_admin_insert" on storage.objects;
create policy "documents_admin_insert" on storage.objects
  for insert with check (bucket_id = 'documents' and is_admin());
drop policy if exists "documents_admin_update" on storage.objects;
create policy "documents_admin_update" on storage.objects
  for update using (bucket_id = 'documents' and is_admin());
drop policy if exists "documents_admin_delete" on storage.objects;
create policy "documents_admin_delete" on storage.objects
  for delete using (bucket_id = 'documents' and is_admin());
