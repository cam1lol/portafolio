# Portafolio de Camilo Ayala

Sitio personal de **Camilo Andrés Ayala**, desarrollador full-stack y diseñador 3D (Bogotá, Colombia). Hace tres trabajos a la vez:

- **Portafolio y hoja de vida** para reclutadores.
- **Vitrina freelance** para ofrecer servicios y recibir contactos.
- **Panel de administración propio** para cambiar todo el contenido sin tocar código.

Es bilingüe (español e inglés, con cambio en caliente), responsive, tiene tema de día y de noche, y una estética techwear / HUD con un único color de acento (naranja ember).

## Qué incluye

**Sitio público**

- Portada con un objeto 3D (Three.js), manifiesto, proyectos destacados, clientes, laboratorio, experiencia, testimonios, servicios, roadmap, bitácora, comentarios y contacto.
- Página propia por proyecto (`/proyectos/<nombre>`) con caso de estudio, resultados, versión móvil, puntos de interés, videos y galería.
- Índice de todos los proyectos con filtros (`/proyectos`).
- Modo reclutador (`/reclutador`): lo esencial en una sola pantalla, listo para imprimir.
- Paleta de comandos (`Ctrl + K`), políticas de privacidad (`/politicas`) y una página 404 propia.

**Panel de administración (`/admin`)**

- Dashboard con visitas, mensajes, comentarios y una lista de lo que le falta a cada proyecto.
- Edición de proyectos, experiencia, servicios, roadmap, clientes, testimonios, laboratorio y bitácora.
- Textos del sitio, orden y visibilidad de las secciones de la portada, ajustes del fondo ("Escena") y modelos 3D.
- Bandeja de mensajes de contacto y moderación de comentarios.

## Tecnologías

| Parte | Con qué |
| --- | --- |
| Interfaz | Angular 20 (componentes standalone, signals, control flow nativo, rutas con carga diferida) |
| 3D | Three.js, usado directamente |
| Idiomas | Transloco (cambio de idioma sin recargar) |
| Base de datos, login y archivos | Supabase |
| Correo de contacto | Web3Forms |
| Alojamiento | Vercel |
| Estilos | CSS con variables (sin librerías de componentes) |
| Pruebas | Karma y Jasmine |

## Requisitos

- **Node.js 20.19 o superior** (se recomienda la 22).
- **npm**.
- **ffmpeg** (opcional): solo si quieres subir videos o imágenes desde el panel en tu computador. Sin él, todo lo demás funciona.

## Puesta en marcha

```bash
npm install
npm start
```

Abre `http://localhost:4200`. La página se recarga sola al guardar cambios.

La configuración pública de Supabase ya está en `src/environments/`, así que no hace falta crear ningún archivo para ver el sitio. Para entrar al panel (`/admin`) necesitas un usuario administrador (ver más abajo).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Arranca el servidor de desarrollo (y el servidor local de medios). |
| `npm run build` | Genera la versión de producción en `dist/`. |
| `npm test` | Ejecuta las pruebas unitarias. |
| `npm run perf` | Mide la fluidez real (fotogramas por segundo) con tu Chrome. Primero arranca `npm start`. |
| `npm run perf -- --mobile --cpu 4` | Lo mismo simulando un teléfono. |
| `npm run media` | Arranca solo el servidor local de medios. |

## Configuración

Los valores están en `src/environments/`:

| Valor | Para qué sirve |
| --- | --- |
| `supabaseUrl` y `supabasePublishableKey` | Conexión con Supabase. La clave "publishable" es pública por diseño: la seguridad real la dan las reglas de acceso de la base de datos. |
| `web3formsKey` | Clave de Web3Forms para que el formulario de contacto envíe también un correo. Si está vacía, los mensajes se guardan igual y se leen en la bandeja del panel. |

Hay un archivo para producción (`environment.ts`) y otro para desarrollo (`environment.development.ts`); Angular elige el correcto solo.

**Nunca** pongas en el código la clave secreta de Supabase (`service_role`). Solo va la pública.

## Cómo está organizado

```
src/
  app/
    core/        Lo que sirve a toda la app: datos (Supabase), login, idioma, tema,
                 transiciones, sonido y el fondo animado.
    shared/      Piezas reutilizables: directivas, modales, iconos, selectores de
                 archivos, utilidades de rendimiento.
    features/    Cada sección o pantalla: portada, proyectos, contacto, políticas...
      admin/     Todo el panel de administración.
  environments/  Configuración de producción y desarrollo.
  styles.css     Colores, tipografías y estilos globales.
public/
  assets/i18n/   Textos de la interfaz en español (es.json) e inglés (en.json).
  media/         Videos e imágenes de los proyectos.
scripts/         Herramientas: servidor de medios, lista de medios, SEO y medidor de fluidez.
docs/            Documentación detallada.
```

## Panel de administración

Entra en `/admin`. Hace falta un usuario con correo y contraseña dado de alta como administrador en Supabase. Un usuario con sesión pero sin ese permiso puede iniciar sesión, pero no puede cambiar nada: lo impide la propia base de datos.

Consejos de uso:

- `Ctrl + S` guarda el formulario en el que estás.
- Si cierras la pestaña con cambios sin guardar, el panel avisa.
- Los proyectos nuevos nacen como **borrador**: no se ven en el sitio hasta que los publiques. Puedes compartir un enlace privado para revisarlos antes.
- En el dashboard, "Pendientes por proyecto" te dice qué falta y te lleva al paso exacto.

## Despliegue en Vercel

1. Importa el repositorio en Vercel (se detecta Angular solo).
2. Comando de build: `npm run build`. Carpeta de salida: `dist/portafolio-front/browser`.
3. Opcional: define la variable `SITE_URL` con tu dominio (por ejemplo `https://midominio.dev`). Sirve para las vistas previas al compartir el enlace y para el mapa del sitio. Si no la defines, Vercel usa su URL de producción.
4. El archivo `vercel.json` ya incluye las cabeceras de seguridad y la regla que manda todas las rutas a la aplicación (para que funcionen las direcciones directas y la página 404).

Al terminar el build se ejecuta `scripts/seo.mjs`, que completa las etiquetas de vista previa y genera `sitemap.xml` y `robots.txt` con los proyectos publicados.

## Reglas del proyecto

- **Rendimiento primero:** el sitio debe mantenerse fluido (60 fps o más) también en portátiles modestos y teléfonos. Solo se animan `transform` y `opacity`, y todo efecto costoso tiene versión ligera.
- **Movimiento reducido:** se respeta `prefers-reduced-motion`.
- **Contenido bilingüe desde los datos:** los textos de proyectos, experiencia y servicios se guardan en español e inglés; nunca se escriben a mano en las plantillas.
- **Sin emojis** en ningún sitio. Los iconos son siempre SVG.
- **Accesibilidad:** foco visible, roles correctos en los modales y navegación completa con teclado.

## Documentación

- [Arquitectura del código](docs/arquitectura.md): cómo está hecho y cómo se amplía.
- [Lógica de negocio](docs/logica-de-negocio.md): qué hace el sitio, quién controla qué y cómo fluye cada proceso.

## Derechos

Todos los derechos reservados. El diseño, el código y los textos son obra de Camilo Andrés Ayala; los proyectos mostrados pertenecen a sus autores o clientes. No se permite copiar ni reutilizar este material sin autorización por escrito.
