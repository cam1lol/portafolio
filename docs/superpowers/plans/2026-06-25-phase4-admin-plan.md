# Plan de implementación — Fase 4 (Panel admin)

> Implementa la Fase 4 definida en `docs/superpowers/specs/2026-06-25-portfolio-rebuild-design.md` §2/§8.
> Fases 1-3 ya implementadas, todo sin commitear (sigue así hasta que el usuario lo pida).
> Supabase real ya tiene: tablas+RLS+bucket `previews` (con la tabla `admins` vacía + `is_admin()`), datos seed, y el sitio público leyendo de ahí.
> No hay todavía ninguna cuenta de Supabase Auth creada — eso lo hace el usuario manualmente como parte de esta fase.

## Fase 0 — Documentation Discovery (verificado en esta sesión)

- `@angular/cdk` estable = `20.2.14` (`peerDependencies: "^20.0.0 || ^21.0.0"`, compatible con `@angular/core@^20.3.0`). API confirmada contra los tipos reales: `cdkDropList`/`cdkDrag`, evento `(cdkDropListDropped)="..."`, `CdkDragDrop<T>`, `moveItemInArray(array, from, to)` de `@angular/cdk/drag-drop`.
- Supabase Storage (confirmado contra el código fuente real ya instalado): `supabase.storage.from('previews').upload(path, file, {upsert:true})` → `{data:{id,path,fullPath}, error}`; `supabase.storage.from('previews').getPublicUrl(path)` es **síncrono** (sin `await`, sin `error`) → `{data:{publicUrl}}`.
- Supabase Realtime (confirmado contra docs oficiales): `supabase.channel('nombre').on('postgres_changes', {event:'INSERT', schema:'public', table:'comments'}, callback).subscribe()` — sintaxis vigente, sin cambios.

## Fase 4.1 — Auth + guard + shell del admin (subagente, bloquea todo lo demás)

1. `src/app/core/auth/auth.service.ts`: `@Injectable({providedIn:'root'})`, inyecta `SupabaseService`. `login(email, password): Observable<void>` envolviendo `supabase.client.auth.signInWithPassword({email, password})`. `logout(): Observable<void>` envolviendo `signOut()`. Signal `session = signal<Session|null>(null)`, poblada en el constructor con `auth.getSession()` (inicial) + `auth.onAuthStateChange(...)` (cambios posteriores).
2. `src/app/core/auth/auth.guard.ts`: `CanActivateFn` que hace `from(supabase.client.auth.getSession())`, mapea a `true` si hay sesión o a `router.createUrlTree(['/admin/login'], {queryParams:{returnUrl: state.url}})` si no — el guard resuelve su propio chequeo async, no depende de que el signal de `AuthService` ya se haya poblado (evita carrera).
3. **Validación anti-inyección en el login** (spec §9, ya definida, aplícala aquí): `FormGroup` con `Validators.required` + regex de email + límites de longitud (254/72) + trim, mensaje de error genérico "credenciales inválidas" (nunca distinto si el email existe o no), backoff simple tras varios intentos fallidos consecutivos (cooldown corto en el propio componente, sin servidor).
4. `src/app/features/admin/login/admin-login.component.ts` (+html+css): formulario simple, estética HUD/mono existente (reutiliza `.field`/`.btn` ya definidos). Al enviar, llama `authService.login(...)`, si OK navega a `returnUrl` o `/admin`, si falla muestra el error genérico.
5. `src/app/features/admin/admin-layout.component.ts` (+html+css): shell del admin con nav lateral o superior (Dashboard, Proyectos, Experiencia, Visibilidad, Comentarios, Bloques) + botón de logout. `<router-outlet>` para las sub-páginas.
6. Reescribe `src/app/features/admin/admin.routes.ts`: `'login'` → `AdminLoginComponent` (sin guard); `''` → `AdminLayoutComponent` con `canActivate:[authGuard]` y rutas hijas (`dashboard`, `projects`, `experience`, `visibility`, `comments`, `blocks`) — las páginas de cada una se construyen en las fases siguientes, por ahora pueden apuntar a componentes placeholder mínimos que la Fase 4.2+ reemplaza.
7. Borra `src/app/features/admin/admin-placeholder.component.*` (ya no hace falta).

**Verificación:** `npm run build` sin errores. Navegar a `/admin` sin sesión redirige a `/admin/login` con `returnUrl=/admin`.

## Fase 4.2 — Dashboard + tracking de visitas (subagente, depende de 4.1)

1. En `AppComponent` (`ngOnInit` o un `effect`), una sola vez por carga de la app: `supabase.client.from('visits').insert({path: location.pathname})` (fire-and-forget, sin bloquear nada, sin mostrar error al usuario si falla). Esto activa por fin la tabla `visits` que quedó creada-pero-sin-uso en la Fase 3.
2. `src/app/features/admin/dashboard/admin-dashboard.component.ts`: stats reales vía Supabase: conteo de `visits` (últimos 30 días), conteo de `comments` totales y pendientes (`approved=false`), conteo de proyectos publicados/totales. Porta el layout `.stats`/`.stat` del prototipo (líneas 250-255).

**Verificación:** recargar la home varias veces, confirmar en el dashboard que el conteo de visitas sube.

## Fase 4.3 — CRUD de proyectos (subagente, depende de 4.1)

1. Amplía `Project` (`project.model.ts`) con los campos que el público no necesita pero el admin sí edita: `previewImage?: string; repoUrl?: string; liveUrl?: string`. Amplía `ProjectsService`: `getAll(): Observable<Project[]>` (sin filtrar `published`, para el admin), `create(project: Omit<Project,'id'>): Observable<Project>`, `update(id, partial): Observable<void>`, `delete(id): Observable<void>`, `reorder(ids: string[]): Observable<void>` (actualiza `sort_order` en batch). Actualiza el mapeo snake_case↔camelCase para los 3 campos nuevos.
2. `src/app/features/admin/projects/admin-projects-list.component.ts`: tabla con `cdkDropList`/`cdkDrag` para reordenar (llama `reorder()` al soltar), toggle de `published` inline, botones editar/borrar (con confirmación antes de borrar — borrar es irreversible).
3. `src/app/features/admin/projects/admin-project-form.component.ts`: formulario de creación/edición con todos los campos (incluye textarea simple con soporte markdown básico para `longEs`/`longEn`, ver spec §8), y `shared/image-upload/image-upload.component.ts` (contrato `@Input value`/`@Output valueChange`, patrón ya documentado en el spec — sube a `supabase.storage.from('previews')`, no a Cloudinary) para `previewImage`.

**Verificación:** crear un proyecto de prueba desde el admin, confirmar que aparece en la home pública (si `published=true`), editarlo, reordenarlo, borrarlo — confirmar que desaparece de la home.

## Fase 4.4 — CRUD de experiencia (subagente, depende de 4.1)

Mismo patrón que 4.3 pero para `experience`: `ExperienceService.getAll/create/update/delete/reorder`, `admin-experience-list.component.ts` (drag&drop + toggle + editar/borrar), `admin-experience-form.component.ts` (incluye edición de `subprojects` como una lista simple editable, ya que es jsonb anidado — un mini-formulario repetible de name/descEs/descEn con agregar/quitar fila).

**Verificación:** igual que 4.3, sobre la sección de experiencia.

## Fase 4.5 — Visibilidad de secciones (subagente, depende de 4.1)

`src/app/features/admin/visibility/admin-visibility.component.ts`: lista de las 7 secciones (`section_visibility`), un toggle por fila que hace `update` directo contra Supabase. Reutiliza `SectionVisibilityService` (ya existe, añádele un método `setVisible(section, visible): Observable<void>`).

**Verificación:** apagar una sección desde el admin, recargar la home pública, confirmar que esa sección ya no aparece (el `@if` de `PublicShellComponent` ya lo soporta desde la Fase 3).

## Fase 4.6 — Moderación de comentarios + Realtime (subagente, depende de 4.1)

`src/app/core/data/comments.service.ts`: `getAll(): Observable<Comment[]>`, `approve(id)`, `hide(id)` (o `delete(id)`), y un método `watchNew(): Observable<Comment>` que envuelve el canal de Realtime (`postgres_changes` con `event:'INSERT', table:'comments'`) para notificar comentarios nuevos sin recargar.

`src/app/features/admin/comments/admin-comments.component.ts`: lista de comentarios (pendientes primero), botones aprobar/ocultar, badge o indicador cuando `watchNew()` emite algo nuevo mientras la página está abierta.

**Nota de alcance, ya señalada en la Fase 3:** seguimos sin formulario público de envío de comentarios (no está en el prototipo). Esta fase modera lo que ya exista en la tabla `comments` (hoy vacía) — para probarlo de verdad, inserta una fila de prueba directo en el SQL Editor.

**Verificación:** insertar un comentario de prueba vía SQL Editor con `approved=false`, confirmar que aparece en el admin para aprobar/ocultar, y que tras aprobarlo aparecería en una futura UI pública de comentarios (que no existe todavía — fuera de alcance).

## Fase 4.7 — Gestor de bloques: CRUD admin + despachador público (subagente, depende de 4.1)

**Decisión de alcance confirmada con el usuario:** CRUD completo + despachador real en el sitio público (no solo el CRUD).

1. `src/app/core/data/blocks.service.ts`: `getPublished(page: string): Observable<Block[]>` (público, filtra `page` y `published=true`, ordena por `sort_order`), y `getAll/create/update/delete/reorder` (admin, sin filtrar `published`).
2. `src/app/features/admin/blocks/admin-blocks-list.component.ts` + `admin-blocks-form.component.ts`: mismo patrón de drag&drop/CRUD que proyectos/experiencia. El formulario tiene un selector de `type` (hero|card_grid|roadmap|text|gallery_3d) y un textarea de `config` en JSON crudo — muestra como placeholder un ejemplo de forma esperada según el tipo elegido (ver punto 3) para que el usuario no tenga que adivinar las claves.
3. `src/app/shared/blocks/block-dispatcher.component.ts`: `@Input({required:true}) block!: Block`, `@switch (block.type)`:
   - `text`: `config: {title?, body}` — bloque de texto simple con la estética `.block.wrap`.
   - `card_grid`: `config: {title?, items: {title, description, icon?}[]}` — grid de cards reutilizando el estilo de `.svc`/`.card`.
   - `roadmap`: `config: {title?, items: {when, title, description}[]}` — reutiliza el estilo `.road` ya existente.
   - `hero`: `config: {eyebrow?, title, lead?}` — bloque de texto destacado, sin objeto 3D (eso sigue siendo exclusivo del hero fijo).
   - `gallery_3d`: **límite honesto de alcance** — cargar un modelo GLB arbitrario subido por el admin es un proyecto aparte (pipeline de carga/optimización de assets 3D). Por ahora este tipo renderiza solo el `title`/`description` de su `config` como placeholder de texto, sin intentar cargar geometría 3D dinámica. Si más adelante se necesita de verdad, es su propia fase.
4. Monta el despachador en `PublicShellComponent`: una zona al final de la página (después de `<app-contact>`) con `@for (block of blocks(); track block.id) { <app-block-dispatcher [block]="block" /> }`, leyendo `blocksService.getPublished('home')` vía `toSignal`.

## Fase final — Activación de la cuenta admin real + verificación

**Pasos manuales del usuario (no del código):**
1. Dashboard de Supabase → Authentication → Users → "Add user" → crear tu usuario admin (email + password).
2. Copiar el UUID de ese usuario y correr en el SQL Editor: `insert into admins (user_id) values ('<tu-uuid>');`
3. Authentication → Settings → desactivar "Allow new users to sign up".
4. Probar login real en `/admin/login` con esas credenciales.

**Verificación de código:**
1. `npm run build` de producción sin errores, budget revisado conscientemente si sube.
2. Grep: cero emojis, cero `sb_secret_`/`service_role`, cero credenciales hardcodeadas fuera de `environment.ts`.
3. Con el navegador real: login funciona, todas las páginas del admin cargan, CRUD de proyectos/experiencia persiste y se refleja en la home pública, toggle de visibilidad funciona, comentarios se pueden moderar.
4. Sin commit (sigue la instrucción de trabajar sin git por ahora).
