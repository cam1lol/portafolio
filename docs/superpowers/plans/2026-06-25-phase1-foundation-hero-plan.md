# Plan de implementación — Fase 1 (Fundación + Hero/3D)

> Implementa la Fase 1 definida en `docs/superpowers/specs/2026-06-25-portfolio-rebuild-design.md` §2.
> No incluye: secciones de contenido público (Fase 2), Supabase real (Fase 3), admin funcional (Fase 4).
> Fuente visual exacta: `D:\Projects\portafolio\camilo-ayala-prototype (2).html`.
> Fuente de negocio/stack: `D:\Projects\portafolio\AGENTS.md`.

## Fase 0 — Documentation Discovery (resultados verificados)

Investigado por subagentes contra npm real, código fuente real y documentación oficial (no memoria/asunción). Lista de "Allowed APIs":

**Entorno**: Node local = `v22.19.0`. Angular CLI/core `latest` = 22.0.4/22.0.2, pero requiere Node `^22.22.3 || ^24.15.0 || >=26.0.0` — **no compatible con el Node actual**. Angular CLI **20** (LTS) requiere Node `^22.12.0` — **sí compatible**. → **Se usa Angular 20** para el scaffold. Cumple "v18+" del AGENTS.md. (Upgrade de Node a 22.22.3+/24.15+ para usar Angular 22 queda fuera de este plan — es una decisión de entorno del usuario, no se toca sin pedirlo.)

**Angular standalone (confirmado generando un proyecto real con `npx @angular/cli@20.3.30 new --routing --skip-install` y leyendo el output)**:
- `main.ts`: `bootstrapApplication(App, appConfig).catch(...)`.
- `app.config.ts`: `ApplicationConfig` con `provideBrowserGlobalErrorListeners()`, `provideZoneChangeDetection({eventCoalescing:true})`, `provideRouter(routes)`.
- El scaffold reciente nombra el componente raíz `app.ts`/clase `App` (sin sufijo `.component`). **Decisión para este proyecto**: AGENTS.md exige explícitamente nombres `kebab-case` con sufijo de tipo (`project-card.component.ts`) — se mantiene esa convención con sufijo en TODOS los componentes propios, incluido el raíz (`app.component.ts`), pasando por encima del nuevo default del schematic.
- Control de flujo: `@if/@else if/@else`, `@for (item of items; track item.id) {} @empty {}` (vars `$count,$index,$first,$last,$even,$odd`), `@switch/@case/@default`.
- Carga diferida: `@defer (on viewport|idle|interaction|hover|timer(ms)|immediate; when cond) {} @placeholder {} @loading (after ms; minimum ms) {} @error {}`.
- Signals: `import { signal, computed, effect, untracked } from '@angular/core'`.
- Rutas lazy: `loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)` (export nombrado + `.then`).

**Three.js (confirmado contra el código fuente real del paquete npm `three@0.184.0`)**:
- Sin cambios de firma para `IcosahedronGeometry`, `EdgesGeometry`, `LineSegments`, `LineBasicMaterial`, `MeshBasicMaterial({wireframe:true})`, `Points`, `PointsMaterial`, `WebGLRenderer`, `PerspectiveCamera`, `Scene`, `Group` respecto al prototipo (r128).
- Nuevas para el círculo de invocación, confirmadas: `TorusGeometry(radius=1, tube=0.4, radialSegments=12, tubularSegments=48, arc=2π)`, `RingGeometry(innerRadius=0.5, outerRadius=1, thetaSegments=32)`, `LineLoop(geometry, material)`.
- Color management: `renderer.outputColorSpace` ya es `THREE.SRGBColorSpace` por defecto — no hay que configurarlo, los hex planos del prototipo (`0xE9EAED`, `0xF2541B`) se ven igual.
- **API eliminada — NO USAR**: `outputEncoding`, `THREE.LinearEncoding`, `THREE.sRGBEncoding` (existían en r128, no existen en 0.184.0; grep sobre el código fuente confirma cero resultados).
- El paquete `three` no trae tipos — `@types/three` (`0.184.1`) sigue siendo devDependency obligatoria.
- Import: `import * as THREE from 'three'`.

**Transloco (confirmado contra npm + código fuente del repo `jsverse/transloco`)**:
- **`@ngneat/transloco` está deprecado** (sin actualizaciones desde v6.0.4) → se instala **`@jsverse/transloco@8.4.0`**.
- Provider: `provideTransloco({ config: { availableLangs: ['es','en'], defaultLang: 'es', reRenderOnLangChange: true, prodMode: !isDevMode() }, loader: TranslocoHttpLoader })`. **Crítico**: `reRenderOnLangChange` default es `false` — hay que poner `true` explícito o el cambio de idioma no se refleja sin recargar (justo lo que pide el AGENTS.md).
- Loader custom: clase que implementa `TranslocoLoader.getTranslation(lang): Observable<Translation>`, inyectando `HttpClient`, leyendo `assets/i18n/${lang}.json`.
- `TranslocoService`: `setActiveLang(lang)`, `getActiveLang()`, `langChanges$`, signal nativo `activeLang: Signal<string>`.
- En plantillas standalone: `TranslocoPipe` se importa directo en `imports: []` del componente (no requiere `TranslocoModule`). `TranslocoModule.forRoot()` está eliminado desde v5 — no usar.

## Fase 1 — Scaffold + dependencias

**Qué hacer**: Borrar el contenido actual de `portafolio-front` (scaffold Angular 16 vacío, sin código propio que perder) y regenerar con `npx @angular/cli@20 new portafolio-front --routing --style=css --skip-install` en el directorio padre, luego mover/fusionar al repo existente preservando `.git`, `docs/`, `AGENTS.md` no aplica aquí (vive en el padre). Confirmar `package.json` resultante usa Angular 20.x.

Instalar: `npm install three @jsverse/transloco` y `npm install -D @types/three`.

**Verificación**: `npm run build` del scaffold limpio compila sin errores antes de tocar nada más. `git status` confirma que `docs/superpowers/` sigue intacto tras la regeneración.

## Fase 2 — Tokens de diseño y estilos globales (ambos temas)

**Qué hacer**: En `src/styles.css`, portar 1:1 los custom properties del prototipo (líneas 12-18 y reglas base 19-23 de `camilo-ayala-prototype (2).html`) bajo `:root` (modo noche, default) y añadir el bloque `[data-theme="day"]` con los tokens invertidos descritos en el spec §4 (ink↔bone, graphite claro, ember sin cambios). Importar las 3 familias de Google Fonts (Archivo, Space Grotesk, Space Mono) vía `<link>` en `index.html`, igual al prototipo (líneas 7-9).

Portar también: reset global (`*{box-sizing,margin,padding}`), `::selection`, y el HUD de esquinas (`.hud .tick` + 4 spans) como un `HudComponent` standalone reutilizado en el shell — copiar markup/CSS de líneas 25-30 y 310-313 del prototipo.

**Verificación**: cargar la app vacía, confirmar visualmente (captura) que el fondo/tipografía coinciden con el prototipo en modo noche; cambiar `data-theme` a mano en devtools y confirmar que los tokens invierten sin romper contraste.

## Fase 3 — ThemeService (modo día/noche)

**Qué hacer**: `core/theme/theme.service.ts`, `providedIn: 'root'`, con `theme = signal<'night'|'day'>(...)`. Inicialización: leer `localStorage.getItem('theme')`; si no existe, usar `matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night'`. Método `toggle()` y `set(theme)` que actualizan el signal, `localStorage.setItem`, y `document.documentElement.setAttribute('data-theme', theme)` (vía `effect()`). Transición de color suave en CSS (`transition: background-color .3s, color .3s` en `body`), envuelta en `@media (prefers-reduced-motion: no-preference)`.

**Verificación**: toggle manual cambia el atributo `data-theme` en `<html>` y persiste tras recargar (localStorage). Con `prefers-reduced-motion: reduce` simulado en devtools, confirmar que no hay transición de color (instantáneo).

## Fase 4 — Shell de la app (header + footer + routing base)

**Qué hacer**: `AppComponent` standalone (mantener `app.component.ts` con sufijo, no `app.ts`) como shell: HUD, `<header>` con `.brand` (glyph "CA" + nombre + rol), `nav.links` (anchors `#work`, `#experience`, `#services`, `#contact` — apuntan a secciones que no existen aún en esta fase, eso es Fase 2 macro, está bien que apunten a anclas vacías por ahora), y `.controls` con **3** `.seg`: idioma (ES/EN), SITE/ADMIN, día/noche (sol/luna SVG Lucide) — markup/CSS portado de líneas 44-63 y 315-339 del prototipo. `<router-outlet>` dentro de `<main>`. `<footer>` portado de líneas 189-191/514-518 (el reloj/coordenadas puede quedar estático en esta fase, se anima en Fase 2 macro si aplica).

`app.routes.ts`: `''` → `PublicShellComponent` (placeholder vacío con solo el `<section class="hero">`, contenido real en Fase 2 macro); `/admin` → lazy `loadChildren` a una `AdminPlaceholderComponent` standalone simple ("Admin — próximamente"), **sin guard todavía** (el `authGuard` real necesita Supabase, que es Fase 3 macro — no se escribe un guard falso/permisivo que aparente seguridad sin tenerla).

El switch SITE/ADMIN del header navega con `Router.navigate(['/'])` / `Router.navigate(['/admin'])` en vez de alternar visibilidad de `<div class="view">` como en el prototipo (eso era necesario en HTML plano sin router; en Angular el router resuelve esto).

**Verificación**: `ng build` sin errores; navegar manualmente a `/` y `/admin` confirma que el lazy chunk de admin solo se descarga al visitarlo (Network tab).

## Fase 5 — i18n con Transloco

**Qué hacer**: `provideTransloco(...)` en `app.config.ts` con `reRenderOnLangChange: true` (crítico, ver Fase 0). `core/i18n/transloco-http.loader.ts` implementando `TranslocoLoader`. `public/assets/i18n/es.json` y `en.json` — por ahora solo con las claves de UI que ya existen en esta fase (`role`, `nav_work`, `nav_xp`, `nav_services`, `nav_contact`, `sw_site`, `sw_admin`), portadas del objeto `I18N` del prototipo (líneas 599-602). El resto de claves (`hero_*`, `ab_*`, etc.) se añaden en Fase 2 macro junto con su contenido. Control ES/EN del header llama a `transloco.setActiveLang(lang)`.

**Verificación**: cambiar el switch ES/EN cambia los textos de nav/brand sin recargar (confirmar en Network tab que no hay full reload), y persiste si se guarda en `localStorage` (Transloco lo hace por defecto vía `GlobalConfig`, confirmar comportamiento real antes de añadir persistencia manual duplicada).

## Fase 6 — Hero 3D (icosaedro)

**Qué hacer**: `features/hero/hero.component.ts` standalone, con un `<div #scene>` y canvas creado en `ngAfterViewInit` (no en el constructor). Portar 1:1 la lógica de `initScene()` del prototipo (líneas 841-866): `IcosahedronGeometry(1.15,1)`, `EdgesGeometry` + `LineBasicMaterial({color:0xE9EAED,...})`, `MeshBasicMaterial({color:0xF2541B,wireframe:true,...})`, `Points`+`PointsMaterial`, parallax con `pointermove` sobre el host, rotación con scroll, loop con `requestAnimationFrame`, `resize` listener. Guardar el `requestAnimationFrame` id y cancelarlo + `renderer.dispose()` en `ngOnDestroy`. Respetar `prefers-reduced-motion` (sin rotación automática, pero deja el parallax si hay puntero — igual que el prototipo línea 843).

Montar el componente en `PublicShellComponent` con `@defer (on viewport)`.

**Verificación**: comparar visualmente lado a lado con el prototipo (mismo wireframe, mismas proporciones, mismo color ember del núcleo). Confirmar con devtools Performance que no hay fuga de memoria al navegar fuera y volver a `/` varias veces (el canvas anterior se destruye).

## Fase 7 — Círculo de invocación (fondo global)

**Qué hacer**: `core/background/summoning-circle.component.ts` standalone, canvas propio `position:fixed;inset:0` con z-index entre el color base de `body` y el contenido (`z-index` justo debajo de `header`/`main`, por encima de nada visual). 2-3 anillos: usar `TorusGeometry`/`LineLoop` (geometría barata, confirmada en Fase 0) con `MeshBasicMaterial`/`LineBasicMaterial` en negro casi puro + ember, cada anillo con velocidad/dirección de rotación distinta vía su propio `rotation.z` incrementado por frame. Opacidad del material entre 0.10-0.18. Colores **fijos** (no leer `ThemeService`, no usar custom properties CSS — constantes hex en el componente, según spec §5).

Pausa con `document.addEventListener('visibilitychange', ...)` (cancelar/reanudar el `requestAnimationFrame`). Si `prefers-reduced-motion: reduce`, renderizar un solo frame estático y no iniciar el loop. `pixelRatio` limitado a `Math.min(devicePixelRatio, 1.5)` (más bajo que el hero, porque corre siempre).

Montar una sola vez en `AppComponent` (no en `PublicShellComponent`, para que persista detrás del admin también).

**Verificación**: confirmar que el círculo gira de forma perpetua y suave en scroll largo sin caída de FPS notable (DevTools Performance, 30s de grabación); confirmar pausa real cuando se cambia de pestaña (Network/Performance muestra el RAF detenido); confirmar frame estático con reduced-motion simulado.

## Fase 8 — Primitivas de animación (reveal / magnetic / counter)

**Qué hacer**: `shared/directives/reveal.directive.ts` (IntersectionObserver, `threshold:.15`, una sola vez, clase `in` — portado de líneas 814-820 del prototipo), `magnetic.directive.ts` (solo `pointer:fine`, portado de líneas 830-838), `counter.directive.ts` (portado de líneas 821-826, `@Input to: number`). Las tres respetan `prefers-reduced-motion` (no observan/no animan, aplican estado final directo). Aplicarlas ya mismo sobre los elementos que existen en esta fase (ej. el eyebrow del hero con `reveal`, el botón CTA si ya existe con `mag`) para verificarlas en vivo, aunque el grueso de su uso real llega con el contenido de la Fase 2 macro.

**Verificación**: scrollear la página de prueba confirma que los elementos con `reveal` aparecen una sola vez al entrar en viewport; mover el mouse sobre un botón `mag` confirma el desplazamiento magnético; con reduced-motion activado, todo aparece visible de inmediato sin transición.

## Fase final — Verificación e integración

1. `npm run build` (producción) sin errores ni warnings de presupuesto de bundle inesperados (Three.js pesa — confirmar que sigue bajo el budget de `angular.json` o ajustar el budget conscientemente, no silenciarlo).
2. Lint/typecheck limpios.
3. Verificación visual con el navegador headless (skill `/browse` o `/qa`): cargar `/`, comparar contra capturas del prototipo en ambos temas (día/noche), confirmar los 3 controles del header funcionan, confirmar navegación a `/admin` carga el placeholder vía chunk separado.
4. Grep de anti-patrones: cero ocurrencias de `outputEncoding`/`sRGBEncoding`/`LinearEncoding`, cero `TranslocoModule.forRoot`, cero `@ngneat/transloco` en imports.
5. Confirmar `prefers-reduced-motion` desactiva: rotación del hero, loop del círculo, transición de tema, reveal/magnetic/counter — los 5 puntos, no solo algunos.
6. Commit (no push) con el resultado de la Fase 1, dejando claro en el mensaje que faltan las Fases 2-4 del spec.
