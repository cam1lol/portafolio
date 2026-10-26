-- Schedules the contact inbox sync (Edge Function contact-sync) every 5 minutes.
--
-- Before running this file, create the shared secret in Vault with the SAME value as the
-- Edge Function secret CRON_SECRET (SQL Editor, run once, replace the placeholder):
--
--   select vault.create_secret('<mismo valor que CRON_SECRET>', 'contact_cron_secret');
--
-- Safe to re-run: the job is replaced, not duplicated.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('contact-sync');
exception when others then
  null; -- the job did not exist yet
end $$;

select cron.schedule(
  'contact-sync',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://krptaszitdbxpsiuxpib.supabase.co/functions/v1/contact-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'contact_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
