# Plan de implementación — Fase 3 (Supabase real)

> Implementa la Fase 3 definida en `docs/superpowers/specs/2026-06-25-portfolio-rebuild-design.md` §2/§7.
> Fases 1 (commit `0d055d8`) y 2 (sin commitear, working tree) ya implementadas.
> **Sin git todavía** — el usuario pidió trabajar sin commits por ahora; esto sigue así hasta que lo pida explícitamente.
> Proyecto Supabase real ya creado por el usuario: `https://krptaszitdbxpsiuxpib.supabase.co`. Solo se usa la **publishable key** (`sb_publishable_UgW-_cQEguqvi4bTu84vmA_5GMG4OzZ`). Las keys secretas que el usuario compartió por error (`sb_secret_...` y el JWT `service_role`) **no se usan ni se escriben en ningún archivo de este plan ni del código** — quedan fuera por completo.

## Fase 0 — Documentation Discovery (verificado en esta sesión)

- `createClient(url, key)` de `@supabase/supabase-js` acepta la nueva `publishable key` exactamente igual que el `anon` JWT legacy, sin cambios de código — confirmado contra docs oficiales de Supabase (las legacy se deprecan a fin de 2026). Fuente: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- El proyecto actual no tiene `src/environments/` todavía. `ng generate environments` es el comando vigente en Angular 20 para crearlo: genera `environment.ts` (producción) + `environment.development.ts`, y añade el `fileReplacements` correspondiente bajo `architect.build.configurations.development` en `angular.json` automáticamente. Fuente: https://angular.dev/tools/cli/environments
- No hay Supabase CLI autenticado ni la contraseña de la base de datos (correctamente no compartida) → las migraciones SQL NO se aplican por CLI ni conexión directa. El usuario las corre manualmente en el **SQL Editor** del dashboard (Project → SQL Editor → New query → pegar → Run). Esto se hace en dos pasos separados de cualquier paso de código.
- **Desviación deliberada de AGENTS.md §6, anotada aquí por transparencia** (no se edita AGENTS.md, es un documento del usuario fuera de este repo):
  - `experience.period` se vuelve `period_es`/`period_en` (dos columnas) en vez de una sola `period`. Motivo: durante la verificación visual de la Fase 2 se confirmó que 2 de las 4 entradas del prototipo llevan etiquetas traducidas distintas ("EN CURSO"/"ONGOING", "FORMACIÓN"/"EDUCATION") — una sola columna pierde esa traducción real. Los modelos TS (`experience.model.ts`) ya quedaron así desde la Fase 2.
  - `section_visibility.section` usa las claves reales de las 7 secciones que existen hoy en el sitio (`hero, manifesto, projects, experience, services, roadmap, contact`) en vez de la lista de AGENTS.md (que no incluye `contact` y sí incluye `comments`, que no es una sección pública real — `comments` ahí parece un desliz de redacción, no algo construido).

## Fase 1 — Esquema SQL (acción MANUAL del usuario en el SQL Editor de Supabase)

**Quién la ejecuta:** el usuario, pegando en el SQL Editor del dashboard (`https://supabase.com/dashboard/project/krptaszitdbxpsiuxpib/sql/new`). Ningún subagente toca esto.

```sql
-- supabase/migrations/0001_init.sql
create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('web','3d','tool')),
  kind text not null check (kind in ('front','back')),
  device text check (device in ('browser','phone')),
  status text not null check (status in ('live','wip','archive')),
  icon text not null,
  type_label text not null,
  summary_es text not null,
  summary_en text not null,
  long_es text not null,
  long_en text not null,
  highlights_es text[] not null default '{}',
  highlights_en text[] not null default '{}',
  stack text[] not null default '{}',
  preview_image text,
  repo_url text,
  live_url text,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists experience (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_es text not null,
  role_en text not null,
  period_es text not null,
  period_en text not null,
  tag_es text not null,
  tag_en text not null,
  is_current boolean not null default false,
  summary_es text not null,
  summary_en text not null,
  points_es text[] not null default '{}',
  points_en text[] not null default '{}',
  stack text[] not null default '{}',
  subprojects jsonb,
  sort_order int not null default 0,
  published boolean not null default true
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  lang text not null,
  body text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists section_visibility (
  section text primary key,
  visible boolean not null default true
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hero','card_grid','roadmap','text','gallery_3d')),
  page text not null,
  config jsonb not null default '{}',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- SECURITY FIX (caught by automated review before this was ever run):
-- `auth.role() = 'authenticated'` is true for ANY logged-in user, not just
-- the site owner. Since this is a single-owner admin (no multi-user roles),
-- that would let anyone who signs up for an account on this Supabase
-- project (public sign-up is on by default) pass every "admin" policy below.
-- Fixed with a single-row admin allowlist + a security-definer helper.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admins enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant execute on function is_admin() to anon, authenticated;

alter table projects enable row level security;
alter table experience enable row level security;
alter table comments enable row level security;
alter table section_visibility enable row level security;
alter table visits enable row level security;
alter table blocks enable row level security;

create policy "projects_public_read" on projects for select using (published = true);
create policy "projects_admin_all" on projects for all using (is_admin()) with check (is_admin());

create policy "experience_public_read" on experience for select using (published = true);
create policy "experience_admin_all" on experience for all using (is_admin()) with check (is_admin());

create policy "comments_public_read_approved" on comments for select using (approved = true);
create policy "comments_public_insert" on comments for insert with check (true);
create policy "comments_admin_all" on comments for all using (is_admin()) with check (is_admin());

create policy "section_visibility_public_read" on section_visibility for select using (true);
create policy "section_visibility_admin_update" on section_visibility for update using (is_admin()) with check (is_admin());

create policy "visits_public_insert" on visits for insert with check (true);
create policy "visits_admin_read" on visits for select using (is_admin());

create policy "blocks_public_read" on blocks for select using (published = true);
create policy "blocks_admin_all" on blocks for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('previews', 'previews', true)
on conflict (id) do nothing;

create policy "previews_public_read" on storage.objects for select using (bucket_id = 'previews');
create policy "previews_admin_write" on storage.objects for insert with check (bucket_id = 'previews' and is_admin());
create policy "previews_admin_update" on storage.objects for update using (bucket_id = 'previews' and is_admin());
create policy "previews_admin_delete" on storage.objects for delete using (bucket_id = 'previews' and is_admin());
```

**Nota para la Fase 4 (admin):** una vez creada tu cuenta en Supabase Auth, hay que correr manualmente `insert into admins (user_id) values ('<tu-uuid-de-auth.users>');` para activar tu acceso — hasta entonces, las políticas `_admin_` bloquean a todo el mundo, incluido un usuario autenticado cualquiera. También se recomienda desactivar el registro público en Authentication → Settings → "Allow new users to sign up", ya que este sitio tiene un solo dueño y no necesita registro abierto.

**Verificación:** en el dashboard, Table Editor debe mostrar las 6 tablas; Storage debe mostrar el bucket `previews`. Sin errores en el SQL Editor al correrlo.

## Fase 2 — Seed de datos (acción MANUAL del usuario, generada por un subagente)

Un subagente de implementación **lee** `src/app/core/data/projects.mock.ts` y `src/app/core/data/experience.mock.ts` tal como existen hoy (no inventa ni resume el contenido) y genera `supabase/seed.sql` con un `insert into projects (...) values (...)` por cada uno de los 6 proyectos y un `insert into experience (...) values (...)` por cada una de las 4 entradas, transcribiendo los textos ES/EN EXACTOS de los archivos mock (incluyendo los placeholders de SIMPLE S.A. tal cual, sin completarlos). También un `insert into section_visibility (section, visible) values (...)` con las 7 claves reales (`hero, manifesto, projects, experience, services, roadmap, contact`), todas `true`.

El usuario corre `supabase/seed.sql` en el SQL Editor DESPUÉS de la Fase 1.

**Verificación:** `select count(*) from projects` debe dar 6; `select count(*) from experience` debe dar 4; `select * from section_visibility` debe dar 7 filas en `true`.

## Fase 3 — Environments + dependencia + SupabaseService (subagente de implementación)

1. `npm install @supabase/supabase-js`.
2. `ng generate environments` (crea `src/environments/environment.ts` + `environment.development.ts` + el `fileReplacements` en `angular.json`).
3. En ambos archivos de environment: `export const environment = { production: true/false, supabaseUrl: 'https://krptaszitdbxpsiuxpib.supabase.co', supabasePublishableKey: 'sb_publishable_UgW-_cQEguqvi4bTu84vmA_5GMG4OzZ' };` — el mismo proyecto Supabase para dev y prod por ahora (no hay un segundo proyecto de staging). Esta key es pública por diseño (AGENTS.md §6), no hace falta ocultarla ni meterla en `.env`.
4. `src/app/core/supabase/supabase.service.ts`: `@Injectable({providedIn:'root'})`, `readonly client = createClient(environment.supabaseUrl, environment.supabasePublishableKey)`.

**Verificación:** `npm run build` sin errores.

## Fase 4 — Servicios de datos (mapeo snake_case → camelCase) y cableado a los componentes (subagente de implementación)

`src/app/core/data/projects.service.ts`: método `getPublished(): Observable<Project[]>` que hace `from(this.supabase.client.from('projects').select('*').eq('published', true).order('sort_order')).pipe(map(...))`, mapeando cada fila snake_case a la interfaz `Project` (camelCase) ya existente — NO se cambia `project.model.ts` ni las plantillas de `ProjectsComponent`/`ModalComponent`, solo de dónde vienen los datos.

`src/app/core/data/experience.service.ts`: igual para `experience`, mapeando a la interfaz `Experience` (incluye `periodEs`/`periodEn`).

`src/app/core/data/section-visibility.service.ts`: `getVisibility(): Observable<Record<string, boolean>>` leyendo `section_visibility`.

Actualizar `ProjectsComponent`: reemplazar el import directo de `PROJECTS` (mock) por `toSignal(projectsService.getPublished(), {initialValue: []})` — el resto de la lógica (`filter`, `computed filtered`, render, click→modal) NO cambia.

Actualizar `ExperienceComponent`: mismo patrón con `EXPERIENCE`.

Actualizar `PublicShellComponent` (o cada sección individualmente, decisión del subagente): leer `SectionVisibilityService` y envolver cada `<app-xxx>` en `@if (visibility()['clave'] !== false)` para que ocultar una sección desde la base de datos funcione (hoy no hay UI admin para cambiarlo, pero la lectura ya debe funcionar de punta a punta).

**Fuera de alcance, NO construir en esta fase:** formulario público de envío de comentarios (no está en el prototipo), llamadas de escritura a `visits` (explícitamente opcional, sin UI que lo consuma todavía).

**Verificación:** `npm run build` sin errores. Con el dev server + navegador real: la home debe verse IDÉNTICA a como se veía con los mocks de la Fase 2 (mismos 6 proyectos, mismas 4 experiencias, mismos textos ES/EN) pero ahora viniendo de Supabase — confirmar con Network tab que hay llamadas reales a `krptaszitdbxpsiuxpib.supabase.co`.

## Fase final — Limpieza y verificación

1. Si la Fase 4 verificó visualmente que todo coincide: borrar `src/app/core/data/projects.mock.ts` y `experience.mock.ts` (ya no se usan, código muerto).
2. `npm run build` de producción sin errores, dentro del budget.
3. Grep: cero referencias a `sb_secret_` o a un JWT con `"role":"service_role"` en cualquier archivo del repo (incluyendo `environment.ts`).
4. Confirmar con el navegador real que cambiar de idioma, tema, y abrir modales sigue funcionando igual que en la Fase 2, ahora con datos reales.
5. Sin commit (sigue la instrucción de trabajar sin git por ahora).
