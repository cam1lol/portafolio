-- Contact inbox (v2): messages from the public contact modal, kept as a backup of the email
-- that Web3Forms sends to Camilo. Visitors can only write through submit_contact(), which
-- validates, rate-limits by hashed IP and stores the conversation. Safe to re-run.

create extension if not exists pgcrypto with schema extensions;

-- Upgrade from the first (Gmail API) version of this migration, if it was applied.
-- Its tables have a different shape and were never written to (its Edge Functions were not
-- deployed), so they are replaced. If they hold any row, stop instead of deleting data.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_threads' and column_name = 'gmail_thread_id'
  ) then
    if exists (select 1 from contact_threads) or exists (select 1 from contact_messages) then
      raise exception 'contact_threads (v1) has data; migrate it manually before applying v2';
    end if;
    drop table if exists contact_sync_state;
    drop table if exists contact_messages;
    drop table if exists contact_threads;
  end if;
end $$;

create table if not exists contact_threads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null default 'other' check (topic in ('project', 'job', 'other')),
  lang text not null check (lang in ('es', 'en')),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  ip_hash text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists contact_threads_ip_created_idx on contact_threads (ip_hash, created_at);
create index if not exists contact_threads_last_message_idx on contact_threads (last_message_at desc);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references contact_threads (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_thread_idx on contact_messages (thread_id, created_at);

-- Private settings: RLS on and no policies, so the API can never read the salt.
create table if not exists contact_settings (
  id smallint primary key check (id = 1),
  ip_salt text not null default encode(extensions.gen_random_bytes(32), 'hex')
);
insert into contact_settings (id) values (1) on conflict (id) do nothing;

alter table contact_threads enable row level security;
alter table contact_messages enable row level security;
alter table contact_settings enable row level security;

drop policy if exists "contact_threads_admin_select" on contact_threads;
create policy "contact_threads_admin_select" on contact_threads for select using (is_admin());
drop policy if exists "contact_threads_admin_update" on contact_threads;
create policy "contact_threads_admin_update" on contact_threads for update using (is_admin()) with check (is_admin());
drop policy if exists "contact_threads_admin_delete" on contact_threads;
create policy "contact_threads_admin_delete" on contact_threads for delete using (is_admin());

drop policy if exists "contact_messages_admin_select" on contact_messages;
create policy "contact_messages_admin_select" on contact_messages for select using (is_admin());
drop policy if exists "contact_messages_admin_delete" on contact_messages;
create policy "contact_messages_admin_delete" on contact_messages for delete using (is_admin());

-- Returns 'received', 'invalid:<field>' or 'rate_limited'.
create or replace function submit_contact(
  p_name text,
  p_email text,
  p_topic text,
  p_message text,
  p_lang text
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := btrim(coalesce(p_email, ''));
  v_topic text := coalesce(nullif(btrim(coalesce(p_topic, '')), ''), 'other');
  v_message text := replace(btrim(coalesce(p_message, '')), E'\r\n', E'\n');
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
  v_hash text;
  v_thread uuid;
begin
  if char_length(v_name) not between 1 and 80 or v_name ~ '[[:cntrl:]]' then
    return 'invalid:name';
  end if;
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^\s@<>(),;"]+@[^\s@<>(),;"]+\.[^\s@<>(),;"]{2,}$' then
    return 'invalid:email';
  end if;
  if v_topic not in ('project', 'job', 'other') then
    return 'invalid:topic';
  end if;
  if char_length(v_message) not between 10 and 5000 or regexp_replace(v_message, E'[\\n\\r]', '', 'g') ~ '[[:cntrl:]]' then
    return 'invalid:message';
  end if;
  if p_lang not in ('es', 'en') then
    return 'invalid:lang';
  end if;

  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', 'unknown'), ',', 1));
  select encode(digest(v_ip || ip_salt, 'sha256'), 'hex') into v_hash from contact_settings where id = 1;

  if (select count(*) from contact_threads where ip_hash = v_hash and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from contact_threads where created_at > now() - interval '1 hour') >= 30 then
    return 'rate_limited';
  end if;

  insert into contact_threads (name, email, topic, lang, ip_hash)
  values (v_name, v_email, v_topic, p_lang, v_hash)
  returning id into v_thread;

  insert into contact_messages (thread_id, body) values (v_thread, v_message);
  return 'received';
end;
$$;

revoke all on function submit_contact(text, text, text, text, text) from public;
grant execute on function submit_contact(text, text, text, text, text) to anon, authenticated;

-- Realtime keeps the "new messages" badge in the admin menu current.
do $$
begin
  alter publication supabase_realtime add table contact_threads;
exception when duplicate_object then null;
end $$;
