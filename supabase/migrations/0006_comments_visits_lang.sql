-- Admin Fase 4: public comments section and visits by language.
-- Safe to re-run.

-- Visits remember the language the page was viewed in (dashboard breakdown).
-- Nullable so rows recorded before this migration stay valid.
alter table visits add column if not exists lang text;
alter table visits drop constraint if exists visits_lang_check;
alter table visits add constraint visits_lang_check check (lang is null or lang in ('es', 'en'));

-- The public comments section gets its own visibility switch.
insert into section_visibility (section, visible)
values ('comments', true)
on conflict (section) do nothing;

-- Place the comments section right before contact in the home layout (once).
do $$
declare
  contact_order integer;
begin
  if exists (select 1 from page_items where item_key = 'section:comments') then
    return;
  end if;

  select sort_order into contact_order from page_items where item_key = 'section:contact';
  if contact_order is null then
    select coalesce(max(sort_order) + 1, 0) into contact_order from page_items where page = 'home';
  else
    update page_items set sort_order = sort_order + 1 where page = 'home' and sort_order >= contact_order;
  end if;

  insert into page_items (item_key, page, item_type, section_key, sort_order)
  values ('section:comments', 'home', 'section', 'comments', contact_order);
end $$;

-- Section heading texts, editable in "Textos del sitio".
insert into site_content (key, value_es, value_en) values
  ('cm_h', 'COMENTARIOS', 'COMMENTS'),
  ('cm_d', 'Deja tu opinión. Se publica después de revisarla.', 'Leave your thoughts. Published after review.')
on conflict (key) do nothing;
