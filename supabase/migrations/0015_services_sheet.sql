-- Services as technical sheets: typical timeline and what is included. Run after 0014.
-- Safe to re-run. Existing services keep their content; the new fields start empty and the site
-- only shows them once they have text.

alter table services add column if not exists timeline_es text not null default '' check (char_length(timeline_es) <= 60);
alter table services add column if not exists timeline_en text not null default '' check (char_length(timeline_en) <= 60);
-- One item per line.
alter table services add column if not exists includes_es text not null default '' check (char_length(includes_es) <= 1500);
alter table services add column if not exists includes_en text not null default '' check (char_length(includes_en) <= 1500);

notify pgrst, 'reload schema';
