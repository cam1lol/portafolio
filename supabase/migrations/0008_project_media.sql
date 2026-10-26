-- Project showcase: slug for /proyectos/<slug>, short preview clip, YouTube demo and case study.
-- Safe to re-run.

alter table projects add column if not exists slug text;
alter table projects add column if not exists preview_video text;
alter table projects add column if not exists demo_video_url text;
alter table projects add column if not exists case_study_es text not null default '';
alter table projects add column if not exists case_study_en text not null default '';

-- Backfill slugs from the name for existing projects (lowercase, accents removed, dashes),
-- adding the id prefix only if two names collide.
update projects p
set slug = s.slug
from (
  select id,
         case when count(*) over (partition by base) > 1 then base || '-' || left(id::text, 4) else base end as slug
  from (
    select id,
           coalesce(nullif(trim(both '-' from regexp_replace(lower(translate(name,
             'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ',
             'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun')), '[^a-z0-9]+', '-', 'g')), ''), 'proyecto') as base
    from projects
  ) named
) s
where p.id = s.id and p.slug is null;

alter table projects alter column slug set not null;

alter table projects drop constraint if exists projects_slug_format;
alter table projects add constraint projects_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80);

alter table projects drop constraint if exists projects_slug_key;
alter table projects add constraint projects_slug_key unique (slug);

alter table projects drop constraint if exists projects_case_study_length;
alter table projects add constraint projects_case_study_length
  check (char_length(case_study_es) <= 12000 and char_length(case_study_en) <= 12000);

-- Public bucket for preview clips: MP4/WebM up to 6 MB, admin-only writes (same pattern as previews).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-media', 'project-media', true, 6291456, array['video/mp4', 'video/webm']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_media_admin_insert" on storage.objects;
create policy "project_media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'project-media' and is_admin());
drop policy if exists "project_media_admin_update" on storage.objects;
create policy "project_media_admin_update" on storage.objects
  for update using (bucket_id = 'project-media' and is_admin());
drop policy if exists "project_media_admin_delete" on storage.objects;
create policy "project_media_admin_delete" on storage.objects
  for delete using (bucket_id = 'project-media' and is_admin());
