-- Public comment submissions must remain pending until an admin approves them.
-- Column grants also prevent callers from supplying approved, id, or created_at.
drop policy if exists "comments_public_insert" on public.comments;
create policy "comments_public_insert"
  on public.comments
  for insert
  to anon, authenticated
  with check (
    approved = false
    and lang in ('es', 'en')
    and char_length(btrim(author)) between 1 and 80
    and char_length(btrim(body)) between 1 and 2000
  );

revoke insert on table public.comments from public, anon, authenticated;
grant insert (author, lang, body) on table public.comments to anon, authenticated;

-- Keep preview uploads small and limited to raster formats supported by the UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'previews',
  'previews',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
