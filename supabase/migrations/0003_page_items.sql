-- Ordered content items for pages (fixed sections and admin-created blocks).
create table if not exists page_items (
  item_key text primary key,
  page text not null default 'home',
  item_type text not null check (item_type in ('section', 'block')),
  section_key text,
  block_id uuid references blocks(id) on delete cascade,
  sort_order integer not null default 0,
  constraint page_items_shape check (
    (item_type = 'section' and section_key is not null and block_id is null)
    or (item_type = 'block' and section_key is null and block_id is not null)
  )
);

create unique index if not exists page_items_section_uq
  on page_items(page, section_key) where item_type = 'section';
create unique index if not exists page_items_block_uq
  on page_items(page, block_id) where item_type = 'block';

alter table page_items enable row level security;

drop policy if exists page_items_read on page_items;
create policy page_items_read on page_items
  for select using (
    page = 'home'
    and (
      item_type = 'section'
      or exists (
        select 1 from blocks
        where blocks.id = page_items.block_id
          and blocks.page = page_items.page
          and blocks.published = true
      )
    )
  );

drop policy if exists page_items_admin on page_items;
create policy page_items_admin on page_items
  for all using (is_admin()) with check (is_admin());

insert into page_items (item_key, page, item_type, section_key, sort_order)
values
  ('section:hero', 'home', 'section', 'hero', 0),
  ('section:ticker', 'home', 'section', 'ticker', 1),
  ('section:manifesto', 'home', 'section', 'manifesto', 2),
  ('section:projects', 'home', 'section', 'projects', 3),
  ('section:experience', 'home', 'section', 'experience', 4),
  ('section:services', 'home', 'section', 'services', 5),
  ('section:roadmap', 'home', 'section', 'roadmap', 6),
  ('section:contact', 'home', 'section', 'contact', 7)
on conflict (item_key) do nothing;
