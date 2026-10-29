# Arquitectura del código

Este documento explica cómo está construido el sitio, para que puedas entenderlo, mantenerlo y ampliarlo. Si solo quieres saber qué hace el sitio y quién controla qué, lee [Lógica de negocio](logica-de-negocio.md).

## 1. Visión general

```
   Visitante / Admin
          |
     Navegador  (aplicación Angular, 100 % en el cliente)
          |
   +------+---------------------------+
   |                                  |
Supabase                         Web3Forms
(datos, login, archivos)         (correo del formulario de contacto)

Vercel solo aloja los archivos ya compilados (HTML, JS, CSS y medios).
```

- No hay servidor propio. Toda la lógica corre en el navegador y habla directamente con Supabase.
- La seguridad no está en el código del navegador (que cualquiera puede leer), sino en las **reglas de acceso de la base de datos**: un visitante solo puede leer lo publicado y escribir mensajes y comentarios; solo un administrador puede cambiar el resto.
- En desarrollo hay una pieza extra: un **servidor local de medios** que permite subir y optimizar videos e imágenes desde el panel. No existe en producción.

## 2. Tecnologías y decisiones

| Decisión | Motivo |
| --- | --- |
| Angular 20 con componentes standalone | Sin módulos; cada componente declara lo que usa. |
| Signals y `computed` | Estado reactivo simple, sin suscripciones manuales en la mayoría de los casos. |
| Control flow nativo (`@if`, `@for`, `@switch`, `@defer`) | Plantillas más legibles y carga diferida de secciones pesadas. |
| Rutas con carga diferida | La portada no descarga el panel de administración ni las páginas de proyecto. |
| Three.js directo, sin envoltorio | Control total del peso y del bucle de dibujo. |
| Transloco para la interfaz | Cambia de idioma sin recargar la página. |
| CSS con variables, sin librería de componentes | Mantiene el diseño propio y el peso bajo. |
| Un solo color de acento | Identidad visual disciplinada; todo lo demás es monocromo. |

## 3. Carpetas

Todo el código está en `src/app`.

### `core/`: lo que sirve a toda la aplicación

| Carpeta | Contenido |
| --- | --- |
| `supabase/` | El cliente único de Supabase que usan todos los servicios. |
| `auth/` | Inicio y cierre de sesión del admin y el guard que protege `/admin`. |
| `data/` | Un servicio por tipo de contenido (proyectos, experiencia, comentarios, mensajes, textos...), los modelos y la lógica de transformación de datos. |
| `i18n/` | Cargador de los archivos de idioma. |
| `theme/` | Tema de día y de noche. |
| `scene/` | Ajustes de comportamiento del sitio (el "director de escena"). |
| `transitions/` | La animación al abrir y cerrar un proyecto. |
| `sound/` | Sonidos de interfaz opcionales. |
| `background/` | El fondo animado: círculo de anillos y lluvia de estrellas. |
| `modal/` | Estado del modal de proyecto o experiencia de la portada. |

### `shared/`: piezas reutilizables

| Carpeta | Contenido |
| --- | --- |
| `directives/` | Efectos reutilizables: aparición al hacer scroll, texto que se descifra, inclinación de tarjetas, contadores, imán, revelado tipo escáner. |
| `perf/` | Utilidades de rendimiento (ver sección 8). |
| `hud/` | Las marcas de esquina, la barra de progreso y las esquinas de foco del teclado. |
| `media/`, `media-picker/` | Reproducción de clips y selector de archivos del panel. |
| `site-text/` | Resolución de textos editables y marcado en línea (negrita, atenuado). |
| `icons/` | Catálogo de iconos SVG con animación propia. |
| `modal/`, `command-palette/`, `boot/` | Modal de proyecto, paleta `Ctrl + K` e intro de la primera visita. |
| `validators/` | Validaciones de formularios (caracteres de control, sugerencia de correo). |
| `gestures/` | Deslizar desde el borde izquierdo para volver (táctil). |

### `features/`: una carpeta por sección o pantalla

Cada sección pública (`hero`, `projects`, `experience`, `services`, `contact`...) es un componente con su plantilla y sus estilos. `project-page/` es la página completa de un proyecto, dividida en varios componentes (capítulos, videos, dispositivos, puntos de interés, historia fija). `admin/` contiene el panel entero.

## 4. Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Portada (`public-shell`). El atajo `/?modo=reclutador` redirige al modo reclutador. |
| `/proyectos` | Índice de proyectos con filtros. |
| `/proyectos/:slug` | Página de un proyecto. |
| `/reclutador` | Modo reclutador. |
| `/politicas` | Políticas de privacidad. |
| `/admin/**` | Panel (protegido por el guard de sesión). |
| cualquier otra | Página 404 con sugerencias. |

Todas las pantallas se cargan de forma diferida salvo la portada. El router usa transiciones de vista y recuerda la posición del scroll al volver atrás.

## 5. Cómo llega el contenido a la pantalla

El patrón se repite en todo el sitio:

```
Supabase  ->  Servicio (core/data)  ->  signal  ->  Componente  ->  Plantilla
```

1. Un **servicio** pide los datos a Supabase y los convierte del formato de la base de datos (snake_case) al del código (camelCase).
2. El componente guarda el resultado en una **signal** y la plantilla lo pinta.
3. Mientras carga se muestran **esqueletos**. Si la consulta falla, la sección recurre a su contenido por defecto o no se pinta, pero nunca rompe la página.
4. La lista pública de proyectos se **guarda en memoria durante la sesión**: portada, índice y página de proyecto comparten una sola petición, y cualquier cambio hecho en el admin la vacía.

### Textos editables

Los textos de la interfaz se resuelven en este orden (lo hace `SiteTextPipe`):

1. El valor guardado desde el panel ("Textos del sitio"), en el idioma activo.
2. El texto del archivo de idioma (`public/assets/i18n/es.json` o `en.json`).
3. Un valor de respaldo indicado en la plantilla.

Así el sitio siempre muestra algo coherente, aunque el panel o la base de datos no respondan.

## 6. Idiomas

Hay dos mecanismos, cada uno para lo suyo:

- **Interfaz** (botones, etiquetas, títulos fijos): archivos `es.json` y `en.json`, con Transloco. El cambio de idioma es inmediato.
- **Contenido** (proyectos, experiencia, servicios...): se guarda bilingüe en la base de datos, con una versión en español y otra en inglés. Si falta la inglesa, se muestra la española.

En el panel hay un traductor asistido que usa el traductor integrado de Chrome (en el propio equipo, sin enviar los textos a ningún servicio). Solo rellena el inglés si está vacío o si todavía tiene una traducción automática sin tocar; nunca pisa lo escrito a mano.

## 7. Diseño visual

- Los colores, tipografías y espaciados son **variables CSS** definidas en `src/styles.css`. El tema de día redefine esas variables; ningún componente tiene colores propios fijos.
- Tipografías: Archivo (titulares), Space Grotesk (texto) y Space Mono (etiquetas y datos).
- El tema inicial sigue la preferencia del sistema y se recuerda en el navegador.
- Los estilos de cada componente van en su propio archivo; cada hoja tiene un límite de tamaño (aviso a 4 kB, error a 8 kB), por eso algunos componentes tienen una segunda hoja.

## 8. Rendimiento

Es una regla central del proyecto. El objetivo es no bajar de 60 fps ni al hacer scroll, en portátiles modestos y en teléfonos.

**Reglas**

- Animar solo `transform` y `opacity`. Nunca tamaños, posiciones ni colores de elementos grandes en cada fotograma.
- Nunca animar el `transform` de un `<svg>` directamente: se anima un `<div>` que lo envuelve.
- Sin `filter` ni `backdrop-filter` en elementos que se mueven.
- Los bucles de animación corren **fuera de la zona de Angular** y se pausan cuando no se ven.
- En un fotograma: primero se mide todo y después se escribe, y solo si el valor cambió.

**Utilidades (`shared/perf/`)**

| Pieza | Para qué |
| --- | --- |
| `ScrollFrameService` | Un único listener de scroll para toda la app. Cada tarea registra una fase de lectura y otra de escritura; todas miden y luego todas escriben, así hay un solo cálculo de layout por fotograma. |
| `whenVisible` | Avisa cuando un elemento entra o sale de pantalla, para pausar bucles, videos o WebGL. |
| `IdleLoop` | Bucle de animación que se duerme solo cuando no hay nada que mover. |

**Modo ligero (`fx-lite`)**

El sitio añade la clase `fx-lite` al `<html>` en equipos modestos: se decide al arrancar (pocos núcleos o poca memoria) o midiendo los fotogramas unos segundos después de cargar. Quita lo más caro (brillos, lluvia, transiciones circulares) y se recuerda una semana. En teléfonos y tablets, donde no hay ratón, se aplican además ajustes propios (menos capas en el fondo, sin grano, cabecera sin difuminado). Todo respeta `prefers-reduced-motion`.

**Medir**

```bash
npm start                              # en una terminal
npm run perf                           # en otra: escritorio
npm run perf -- --mobile --cpu 4       # teléfono simulado
```

Abre Chrome con ventana (para usar la GPU real) y cuenta los fotogramas que de verdad llegan a pantalla.

## 9. Fondo animado y transiciones

- **`ring-layer`**: el círculo de anillos del fondo. Cada anillo es su propio SVG; el giro y el movimiento con el cursor se hacen sobre contenedores, no sobre el SVG. Acelera al hacer scroll, se atenúa sobre las secciones con mucho texto y reacciona al abrir un proyecto.
- **`star-rain`**: meteoros finos en un canvas, que solo anima mientras hay alguno en pantalla.
- **`hud`**: marcas de esquina, progreso de scroll e índice de la sección visible ("03 / 09").
- **Transiciones entre proyecto y tarjeta**: `ProjectTransitionService` usa la API de transiciones de vista del navegador. La tarjeta, el título y la imagen comparten nombre entre la lista y la página, y el navegador los transforma de una a otra. Con movimiento reducido se cambia por un fundido corto.

## 10. Panel de administración

- **Layout** (`admin-layout`): barra superior, menú lateral y la página activa. Avisa antes de cerrar la pestaña si hay formularios sin guardar.
- **Protección**: `authGuard` comprueba la sesión; la base de datos comprueba además que el usuario sea administrador.
- **Colecciones simples** (servicios, roadmap, ticker, clientes, testimonios, laboratorio, bitácora): no tienen un componente cada una. Se definen en `collection.config.ts` (qué campos tiene cada una, de qué tipo, bilingüe o no) y dos pantallas genéricas (lista y formulario) se construyen a partir de esa configuración.
- **Formulario de proyectos**: el más complejo. Va por pasos (identidad, tarjeta y portada, historia, ficha y cifras, capítulos, galería, extras, publicar), con vista previa en vivo de la página real, borrador local en el navegador, modo "solo español" con traductor y organizador del orden de las secciones.
- **Piezas comunes** (`admin/shared`): cabecera, índice de pasos, etiquetas, selector de iconos, selector de equipo y duración, atajo `Ctrl + S`, avisos de guardado, traductor y sugerencias basadas en lo ya escrito.

## 11. Medios (videos, imágenes, PDF)

- Los medios de los proyectos viven en `public/media/projects/<proyecto>/` y se publican junto con el sitio.
- `scripts/media-manifest.mjs` genera la lista de archivos antes de arrancar y de compilar, para que el panel ofrezca elegirlos.
- En desarrollo, `scripts/media-server.mjs` (lo arranca `proxy.conf.mjs` dentro de `npm start`) recibe archivos del panel, los **optimiza con ffmpeg** (video H.264 de hasta 1080p, póster, clip corto de vista previa; imágenes a WebP) y los guarda en esa carpeta. Solo escucha en tu equipo y rechaza peticiones de otros orígenes.
- En producción el servidor no existe: el panel solo lista los archivos que ya están en el repositorio. El CV en PDF sí se sube desde el panel publicado, a un almacenamiento de Supabase.

## 12. Compilación y despliegue

1. `npm run build` ejecuta `prebuild` (lista de medios), compila Angular y ejecuta `postbuild`.
2. `scripts/seo.mjs` completa en el HTML las etiquetas de vista previa con el dominio real y genera `sitemap.xml` y `robots.txt` con los proyectos publicados.
3. `vercel.json` añade cabeceras de seguridad y manda todas las rutas a la aplicación.
4. Límites de tamaño del build: aviso a 650 kB y error a 1 MB para el paquete inicial.

## 13. Pruebas

- Karma y Jasmine: `npm test`.
- Hay pruebas de la lógica de datos (transformaciones, filtros, validaciones) y de los componentes principales (página de proyecto, servicios, 404, formulario de contacto, atajo de guardado...).
- Los nombres de las pruebas están en español y describen el comportamiento esperado.

## 14. Cómo ampliar

**Añadir una colección simple al admin** (por ejemplo, "Premios")
1. Crear la tabla en Supabase con sus reglas de acceso.
2. Añadir su entrada en `collection.config.ts` (campos, etiquetas, icono).
3. Añadir el componente que la pinta en la portada, leyendo con `CollectionsService`.

**Añadir una sección a la portada**
1. Crear el componente en `features/`.
2. Registrarlo en `public-shell` (con su clave de visibilidad) y en el orden por defecto.

**Añadir una sección a la página de proyecto**
1. Sumarla a la lista `PAGE_SECTIONS` (así aparece en el organizador).
2. Pintarla en la plantilla de `project-page` y decir en el organizador cuándo "tiene contenido".

**Añadir o cambiar un texto de la interfaz**
1. Añadir la clave en `es.json` y `en.json`.
2. Usarla con el pipe `transloco` (o `siteText` si debe poder editarse desde el panel).

## 15. Convenciones

- Nombres de archivos y componentes en inglés y `kebab-case` (`project-card.component.ts`).
- Comentarios en español, solo donde explican el porqué de algo.
- Contenido bilingüe siempre desde los datos, nunca escrito en la plantilla.
- Sin emojis; iconos siempre como SVG.
- Todo lo nuevo se comprueba con `npm run perf` antes de darlo por terminado.
