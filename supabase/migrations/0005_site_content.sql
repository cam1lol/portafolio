-- Admin Fase 2: editable site texts, services, roadmap and ticker.
-- Safe to re-run: tables/policies are idempotent and seeds never overwrite edits.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Bilingual key/value texts. Keys match public/assets/i18n/*.json so the
-- frontend can fall back to i18n when a key is missing or empty.
create table if not exists site_content (
  key text primary key check (key ~ '^[a-z0-9_]{1,60}$'),
  value_es text not null default '' check (char_length(value_es) <= 4000),
  value_en text not null default '' check (char_length(value_en) <= 4000),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  description_es text not null default '' check (char_length(description_es) <= 1000),
  description_en text not null default '' check (char_length(description_en) <= 1000),
  price_es text not null default '' check (char_length(price_es) <= 120),
  price_en text not null default '' check (char_length(price_en) <= 120),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists roadmap_items (
  id uuid primary key default gen_random_uuid(),
  when_es text not null default '' check (char_length(when_es) <= 60),
  when_en text not null default '' check (char_length(when_en) <= 60),
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  description_es text not null default '' check (char_length(description_es) <= 1000),
  description_en text not null default '' check (char_length(description_en) <= 1000),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ticker_items (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: public reads published rows, only is_admin() writes.
-- ---------------------------------------------------------------------------

alter table site_content enable row level security;
alter table services enable row level security;
alter table roadmap_items enable row level security;
alter table ticker_items enable row level security;

drop policy if exists "site_content_public_read" on site_content;
create policy "site_content_public_read" on site_content for select using (true);
drop policy if exists "site_content_admin_all" on site_content;
create policy "site_content_admin_all" on site_content for all using (is_admin()) with check (is_admin());

drop policy if exists "services_public_read" on services;
create policy "services_public_read" on services for select using (published = true);
drop policy if exists "services_admin_all" on services;
create policy "services_admin_all" on services for all using (is_admin()) with check (is_admin());

drop policy if exists "roadmap_items_public_read" on roadmap_items;
create policy "roadmap_items_public_read" on roadmap_items for select using (published = true);
drop policy if exists "roadmap_items_admin_all" on roadmap_items;
create policy "roadmap_items_admin_all" on roadmap_items for all using (is_admin()) with check (is_admin());

drop policy if exists "ticker_items_public_read" on ticker_items;
create policy "ticker_items_public_read" on ticker_items for select using (published = true);
drop policy if exists "ticker_items_admin_all" on ticker_items;
create policy "ticker_items_admin_all" on ticker_items for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Seeds: verbatim copy of the current i18n texts and template values.
-- Rich text uses the inline markup: **bold**, __muted__, newline = line break.
-- contact_email confirmed by Camilo on 2026-10-25.
-- ---------------------------------------------------------------------------

insert into site_content (key, value_es, value_en) values
  ('hero_eyebrow', 'PORTFOLIO // ÍNDICE 00 — V.1', 'PORTFOLIO // INDEX 00 — V.1'),
  ('hero_l1', 'CONSTRUYO', 'BUILDING'),
  ('hero_l2', 'INTERFACES', 'INTERFACES'),
  ('hero_l3', 'EN MOVIMIENTO', 'IN MOTION'),
  ('hero_lead', 'Desarrollador full-stack y diseñador 3D. Construyo productos web rápidos y experiencias interactivas con Angular, Three.js y criterio editorial en cada detalle.', 'Full-stack developer and 3D designer. I build fast web products and interactive experiences with Angular, Three.js and an editorial eye on every detail.'),
  ('m1k', 'EXPERIENCIA', 'EXPERIENCE'),
  ('hero_m1_value', '3', '3'),
  ('m1u', 'AÑOS', 'YRS'),
  ('m2k', 'PROYECTOS', 'PROJECTS'),
  ('hero_m2_value', '11', '11'),
  ('m3k', 'STACK', 'STACK'),
  ('hero_m3_value', '14', '14'),
  ('cta1', 'VER PROYECTOS', 'VIEW PROJECTS'),
  ('cta2', 'DESCARGAR CV', 'DOWNLOAD CV'),
  ('ab_h', 'MANIFIESTO', 'MANIFESTO'),
  ('ab_d', 'El criterio detrás de cada decisión técnica y visual.', 'The reasoning behind every technical and visual decision.'),
  ('ab_body', 'Diseño y construyo como una sola disciplina. **Cada milisegundo de carga, cada transición y cada componente** existe por una razón. __Nada decorativo, nada genérico —__ sistemas que se sienten rápidos, precisos y deliberados.', 'I design and build as one discipline. **Every millisecond of load, every transition and every component** exists for a reason. __Nothing decorative, nothing generic —__ systems that feel fast, precise and deliberate.'),
  ('wk_h', 'PROYECTOS', 'WORK'),
  ('wk_d', 'Filtra por disciplina. Toca una card para el detalle.', 'Filter by discipline. Tap a card for detail.'),
  ('xp_h', 'EXPERIENCIA', 'EXPERIENCE'),
  ('xp_d', 'Trayectoria. Toca un rol para ver logros y stack.', 'Career path. Tap a role for achievements and stack.'),
  ('sv_h', 'SERVICIOS', 'SERVICES'),
  ('sv_d', 'Freelance. Alcance claro, entregables claros.', 'Freelance. Clear scope, clear deliverables.'),
  ('rd_h', 'ROADMAP', 'ROADMAP'),
  ('rd_d', 'Proyectos personales en curso y a futuro.', 'Personal projects in progress and ahead.'),
  ('contact_eyebrow', '// LET''S BUILD', '// LET''S BUILD'),
  ('ct_h', E'TRABAJEMOS\nJUNTOS', E'LET''S BUILD\nTOGETHER'),
  ('ct_l', 'Disponible para proyectos freelance y roles full-stack. Respuesta en menos de 24h.', 'Available for freelance projects and full-stack roles. Reply within 24h.'),
  ('contact_email', 'kmilo0230@gmail.com', 'kmilo0230@gmail.com')
on conflict (key) do nothing;

insert into services (title_es, title_en, description_es, description_en, price_es, price_en, sort_order)
select * from (values
  ('WEB APPS', 'WEB APPS',
   'Aplicaciones Angular/Vue standalone, arquitectura limpia, offline-first y despliegue en Vercel.',
   'Standalone Angular/Vue apps, clean architecture, offline-first and Vercel deployment.',
   'DESDE · COTIZACIÓN POR ALCANCE', 'FROM · QUOTE BY SCOPE', 0),
  ('EXPERIENCIAS 3D', '3D EXPERIENCES',
   'Modelado en Blender + integración Three.js / TresJS. Configuradores y landings inmersivas.',
   'Blender modeling + Three.js / TresJS integration. Configurators and immersive landings.',
   'DESDE · COTIZACIÓN POR ALCANCE', 'FROM · QUOTE BY SCOPE', 1),
  ('DESIGN SYSTEMS', 'DESIGN SYSTEMS',
   'Sistemas de componentes, tokens y guías. Identidad coherente entre diseño y código.',
   'Component systems, tokens and guidelines. Coherent identity between design and code.',
   'DESDE · COTIZACIÓN POR ALCANCE', 'FROM · QUOTE BY SCOPE', 2)
) as seed(title_es, title_en, description_es, description_en, price_es, price_en, sort_order)
where not exists (select 1 from services);

insert into roadmap_items (when_es, when_en, title_es, title_en, description_es, description_en, sort_order)
select * from (values
  ('NOW · 2026', 'NOW · 2026', 'Cauce', 'Cauce',
   'App de finanzas personales para LATAM. Vue 3 + Ionic + Capacitor, offline-first con SQLite y resumen mensual 3D "Tu historia financiera".',
   'Personal finance app for LATAM. Vue 3 + Ionic + Capacitor, offline-first with SQLite and a 3D monthly summary "Your financial story".', 0),
  ('ACTIVE', 'ACTIVE', 'Velamentum', 'Velamentum',
   'Marca de ropa con visualización 3D interactiva. Blender exportado a GLB para configurador web en Three.js.',
   'Clothing brand with interactive 3D visualization. Blender exported to GLB for a web configurator in Three.js.', 1),
  ('NEXT', 'NEXT', 'Portfolio v2 · WebGPU', 'Portfolio v2 · WebGPU',
   'Migración de escenas a WebGPU para mayor complejidad visual manteniendo 60fps. Modo mundo navegable.',
   'Migrating scenes to WebGPU for more visual complexity while keeping 60fps. Navigable world mode.', 2)
) as seed(when_es, when_en, title_es, title_en, description_es, description_en, sort_order)
where not exists (select 1 from roadmap_items);

insert into ticker_items (label, sort_order)
select * from (values
  ('Angular', 0), ('TypeScript', 1), ('Three.js', 2), ('Blender', 3),
  ('Java', 4), ('Spring Boot', 5), ('Node.js', 6), ('Vue 3', 7),
  ('Ionic', 8), ('AWS', 9), ('Python', 10), ('FastAPI', 11)
) as seed(label, sort_order)
where not exists (select 1 from ticker_items);
