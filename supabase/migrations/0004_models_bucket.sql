-- Publicly readable, admin-managed storage for self-contained GLB assets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'models',
  'models',
  true,
  20971520,
  array['model/gltf-binary']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists models_public_read on storage.objects;
create policy models_public_read on storage.objects
  for select to public
  using (bucket_id = 'models');

drop policy if exists models_admin_insert on storage.objects;
create policy models_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'models' and public.is_admin());

drop policy if exists models_admin_update on storage.objects;
create policy models_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'models' and public.is_admin())
  with check (bucket_id = 'models' and public.is_admin());

drop policy if exists models_admin_delete on storage.objects;
create policy models_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'models' and public.is_admin());
