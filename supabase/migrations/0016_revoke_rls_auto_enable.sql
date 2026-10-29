-- Seguridad: rls_auto_enable() la crea Supabase (activa RLS en las tablas nuevas) y quedó expuesta
-- como /rest/v1/rpc/rls_auto_enable para cualquiera. Solo la necesita el propio Postgres, así que se
-- retira el permiso de ejecución a los roles públicos. Seguro de volver a ejecutar; si la función no
-- existe, no hace nada.

do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';
