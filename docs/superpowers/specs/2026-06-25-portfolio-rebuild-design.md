# Portfolio Camilo Ayala — Rediseño en Angular standalone

> Fuente de verdad de negocio/contenido: `D:\Projects\portafolio\AGENTS.md`.
> Fuente de verdad visual: `D:\Projects\portafolio\camilo-ayala-prototype (2).html` (prototipo aprobado).
> Este documento solo cubre lo que el AGENTS.md dejaba abierto o lo que el usuario pidió de nuevo en esta sesión (modo día/noche, círculo de invocación, admin con sistema de bloques real). Donde no se repite una decisión del AGENTS.md, ese documento sigue mandando.

## 1. Contexto

El proyecto actual (`portafolio-front`) es un scaffold default de `ng new` en Angular 16 con `NgModule`, sin código propio. El AGENTS.md ya define stack, tokens de diseño, modelo de datos y estructura de la app para un portfolio personal de Camilo Ayala (full-stack + diseñador 3D) que cumple tres roles: hoja de vida para reclutadores, vitrina freelance, y panel de administración propio sin tocar código.

Esta sesión añade tres requisitos nuevos sobre esa base:
1. Modo día/noche.
2. Animación perpetua de "círculo de invocación" (rojo carmesí + negro).
3. Panel admin con CRUD real y sistema de bloques, más sofisticado que la maqueta del prototipo.

## 2. Decisión de fases

El proyecto es demasiado grande para un solo plan de implementación. Se construye en fases, cada una con su propio plan vía `writing-plans`, pero bajo este único documento de diseño porque todas comparten el mismo sistema de diseño y arquitectura:

1. **Fundación + Hero/3D** *(primera fase a implementar)* — scaffold Angular standalone, sistema de diseño/tokens, HUD, header con sus 3 controles, routing base, i18n con Transloco, hero con icosaedro Three.js, modo día/noche, círculo de invocación de fondo.
2. **Sitio público** — manifiesto, proyectos (tabs + modal), experiencia (timeline + modal), servicios, roadmap, contacto — con datos estáticos/mock primero.
3. **Backend Supabase** — esquema SQL, políticas RLS, `SupabaseService`, conexión de las secciones públicas a datos reales.
4. **Panel admin** — dashboard, CRUD proyectos/experiencia, gestor de bloques, drag&drop, subida de imágenes, moderación de comentarios, auth.

## 3. Arquitectura y stack

- Angular standalone (última versión estable, v18+), Signals, control de flujo nativo (`@if`/`@for`/`@switch`), sin `NgModule`.
- El sitio público es **una sola ruta con scroll/anchors** (no multi-página), igual al prototipo. El lazy loading real aplica a:
  - `/admin/**` — feature completa cargada solo al visitarla, protegida por `authGuard`.
  - Componentes pesados (escena 3D del hero, círculo de fondo, modales) vía bloques `@defer` de Angular (ej. `@defer (on viewport)` en el hero) para no bloquear el first paint.
- Three.js encapsulado: cada efecto 3D vive en su propio componente standalone con su propio ciclo de vida (`ngAfterViewInit` crea el render loop, `ngOnDestroy` lo destruye).
- **Dependencias nuevas a instalar** (ninguna existe hoy en `package.json`):
  - `three` + `@types/three` — motor 3D, reemplaza el `<script>` CDN del prototipo.
  - `@ngneat/transloco` — i18n runtime (ES/EN sin recargar).
  - `@supabase/supabase-js` — cliente backend (preparado desde la fase 1, usado desde la fase 3).
  - `@angular/cdk` — drag&drop de bloques/proyectos en el admin (fase 4) y, opcionalmente, overlay para modales.

## 4. Sistema de diseño y theming (modo día/noche)

- Tokens portados 1:1 del prototipo como custom properties CSS: `--ink`, `--graphite`, `--graphite-2`, `--line`, `--line-soft`, `--steel`, `--bone`, `--bone-dim`, `--ember`, `--ember-soft`, `--good`. Mismas fuentes (Archivo / Space Grotesk / Space Mono), mismo HUD de esquinas, mismo principio de "un solo color señal".
- **Modo noche** = el tema del prototipo, intacto. Es el default.
- **Modo día** = el mismo sistema invertido, no un tema genérico nuevo:
  - `--ink` → hueso claro (fondo); `--bone` → casi negro (texto principal).
  - `--graphite` / `--graphite-2` → grises claros de superficie elevada.
  - `--line` / `--line-soft` → grises de borde claros.
  - `--ember` se mantiene igual en ambos modos — firma de marca, no se toca.
  - `--good` se ajusta levemente solo si el contraste sobre fondo claro lo exige.
- **Mecanismo**: atributo `data-theme="night"|"day"` en `<html>`, dos bloques de custom properties en CSS global (`:root` y `[data-theme="day"]`). `ThemeService` con signal, persistido en `localStorage`; en la primera carga (sin preferencia guardada) respeta `prefers-color-scheme`.
- **Control**: tercer segmented control en el header junto a ES/EN y SITE/ADMIN, iconos SVG sol/luna (Lucide), mismo estilo `.seg` — cero emoji.
- Transición de color suave al cambiar de tema, respetando `prefers-reduced-motion`.

## 5. Animaciones

Portados 1:1 desde el prototipo como directivas/servicios Angular reutilizables (reemplazan el JS vanilla):

- `RevealDirective` (`.reveal` / `.clip`) — IntersectionObserver, dispara una sola vez, respeta `prefers-reduced-motion`.
- `MagneticDirective` (`.mag`) — solo con puntero fino (`pointer:fine`).
- `CounterDirective` — contadores numéricos del hero.
- Ticker de tecnologías — loop infinito CSS, pausa en hover.
- Dibujo de la línea de timeline de experiencia al entrar en viewport.

**Hero 3D**: componente standalone con canvas propio. Icosaedro wireframe + puntos + núcleo ember, igual al prototipo: rotación perpetua, parallax con puntero, leve giro con scroll. Cargado vía `@defer (on viewport)`. Desacoplado del objeto 3D específico para poder cambiarlo después por el GLB de la camiseta de Velamentum sin tocar el resto de la arquitectura (decisión pendiente del AGENTS.md §9, resuelta para esta fase: se usa el icosaedro).

**Círculo de invocación** (nuevo, fondo global):
- Componente standalone propio, canvas Three.js **separado** del hero (dos contextos WebGL livianos en vez de un motor único — más simple de aislar, pausar y mantener).
- `position: fixed; inset: 0;`, z-index por debajo de todo el contenido pero encima del color de fondo base.
- 2–3 anillos concéntricos (geometría barata en GPU: `TorusGeometry` / `RingGeometry` / `LineLoop`) rotando perpetuamente, cada uno a velocidad y dirección distinta.
- Colores **fijos**, no invierten con el tema día/noche: negro/casi-negro de base + rojo carmesí ember en trazos/glow — firma de marca igual que el acento ember.
- Opacidad baja (10–18%) para no competir nunca con la legibilidad del contenido.
- Pausado en `document.visibilitychange` cuando la pestaña no es visible; `pixelRatio` limitado; frame estático si `prefers-reduced-motion: reduce`.

## 6. Estructura de la app, routing e i18n

- `AppComponent` standalone como shell: header (brand, nav, controles ES/EN + SITE↔ADMIN + día/noche), HUD de esquinas, `<router-outlet>`, footer.
- Rutas:
  - `''` → `PublicShellComponent` (hero → manifiesto → proyectos → experiencia → servicios → roadmap → contacto, una sola página).
  - `/admin/login` → login Supabase Auth.
  - `/admin/**` → feature lazy-loaded (`loadChildren`), protegida por `authGuard`.
- **i18n con Transloco**: textos de UI en `assets/i18n/es.json` / `en.json`, cambio en caliente. Contenido (proyectos, experiencia) bilingüe desde Supabase (`_es`/`_en`), nunca hardcodeado en plantillas.
- Modal de detalle (proyecto/experiencia): componente standalone reutilizable con `@switch` interno para los 3 tipos de preview (browser / phone / flow-diagram), igual al prototipo.

## 7. Modelo de datos y Supabase

Tablas del AGENTS.md §6 sin cambios: `projects`, `experience`, `comments`, `section_visibility`, `visits`. Se añade:

- **`blocks`** (nueva): `id (uuid pk), type (text: hero|card_grid|roadmap|text|gallery_3d), page (text), config (jsonb), sort_order (int), published (bool), created_at (timestamptz)`. `config` guarda los datos propios de cada tipo de bloque; el front lo renderiza con un dispatcher `@switch` sobre `type` — catálogo tipado, sin generar código en vivo.
- **Storage**: bucket `previews` (ya previsto en AGENTS.md) para imágenes de proyectos subidas desde el admin.
- **RLS**: misma intención del AGENTS.md §6 (anon `SELECT` solo `published=true`; autenticado CRUD completo). `blocks` sigue el mismo patrón que `projects`.
- `SupabaseService` único, cliente creado con `url`/`anonKey` desde `environment.ts` (y variables de entorno en Vercel), expuesto vía DI.

## 8. Panel admin

Sobre la base del AGENTS.md §5 (dashboard, CRUD proyectos/experiencia, visibilidad de secciones, moderación de comentarios), la versión "sin tocar código" añade:

- CRUD real contra Supabase (no mock): crear/editar/borrar/togglear visibilidad persiste de inmediato.
- Gestor de bloques: catálogo tipado (Hero, CardGrid, Roadmap, Texto, Galería3D) que se agrega, reordena y despublica desde el admin; el front los renderiza dinámicamente.
- Reordenar con drag & drop (Angular CDK) en proyectos/experiencia y en bloques — actualiza `sort_order` al soltar.
- Subida de imágenes de preview de proyectos directo a Supabase Storage desde el formulario.
- Editor simple para descripciones largas (`long_es`/`long_en`): textarea con soporte markdown básico (negrita/listas), sin librería pesada de rich-text.
- Moderación de comentarios real contra la tabla `comments`, con Realtime para ver comentarios nuevos sin refrescar.
- Auth: Supabase Auth de un solo usuario admin, sesión persistida, guard en `/admin/**`.

## 9. Datos pendientes de confirmar (heredado de AGENTS.md §9 — NO inventar)

- SIMPLE S.A.: fechas exactas y 2–3 logros reales.
- Thomas Processing & Systems: confirmar rango de fechas real.
- Email de contacto real (el prototipo usa un placeholder).
- Objeto 3D del hero: **resuelto para esta fase** → icosaedro wireframe. El GLB de Velamentum queda como posible swap futuro, sin romper arquitectura.

## 10. Convenciones (heredadas del AGENTS.md §8, sin cambios)

Cero emojis en cualquier parte (UI, comentarios, commits, textos) — iconos siempre SVG (Lucide/Bootstrap Icons). Sin degradados genéricos ni efectos "de IA" por defecto. Nombres de componentes/archivos en inglés, kebab-case. Contenido bilingüe siempre desde datos. Accesibilidad: `prefers-reduced-motion`, foco visible, roles correctos en modales.
