-- Contact inbox: conversations from the public contact form, synced with Gmail.
-- Rows are written only by Edge Functions (service_role); the admin reads and manages them.
-- Safe to re-run.

create table if not exists contact_threads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null default '' check (char_length(subject) <= 120),
  lang text not null check (lang in ('es', 'en')),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  gmail_thread_id text unique,
  last_message_header_id text,
  ip_hash text,
  sync_error text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists contact_threads_ip_created_idx on contact_threads (ip_hash, created_at);
create index if not exists contact_threads_last_message_idx on contact_threads (last_message_at desc);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references contact_threads (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  body text not null check (char_length(body) <= 10000),
  gmail_message_id text unique,
  source text not null check (source in ('form', 'panel', 'gmail')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_thread_created_idx on contact_messages (thread_id, created_at);

create table if not exists contact_sync_state (
  id smallint primary key check (id = 1),
  last_sync_at timestamptz,
  last_error text,
  last_error_at timestamptz
);

insert into contact_sync_state (id) values (1) on conflict (id) do nothing;

-- RLS: admin-only reads and changes. No insert policy at all: only service_role writes.
alter table contact_threads enable row level security;
alter table contact_messages enable row level security;
alter table contact_sync_state enable row level security;

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

drop policy if exists "contact_sync_state_admin_select" on contact_sync_state;
create policy "contact_sync_state_admin_select" on contact_sync_state for select using (is_admin());

-- Realtime for the admin inbox (new conversations and messages appear without reloading).
do $$
begin
  alter publication supabase_realtime add table contact_threads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table contact_messages;
exception when duplicate_object then null;
end $$;
