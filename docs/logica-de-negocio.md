# Lógica de negocio

Este documento explica **qué hace el sitio, quién controla qué y cómo funciona cada proceso**, sin entrar en el código. Para el detalle técnico, mira [Arquitectura del código](arquitectura.md).

## 1. Para qué existe el sitio

Es el sitio personal de Camilo Ayala y tiene tres trabajos:

1. **Mostrar su trabajo** a reclutadores y empresas: proyectos, experiencia, forma de trabajar.
2. **Vender servicios freelance** a clientes: qué ofrece, cuánto tarda, qué incluye y cómo pedir una cotización.
3. **Gestionarse solo**: un panel propio permite cambiar todo el contenido sin tocar código ni volver a desplegar.

### Quién lo usa

| Quién | Qué hace |
| --- | --- |
| **Visitante** (reclutador, cliente, curioso) | Lee, navega, escribe un mensaje o deja un comentario. No necesita cuenta. |
| **Administrador** (Camilo) | Entra al panel, edita contenido, modera comentarios y responde mensajes. |

## 2. Quién controla qué

Casi todo lo que se ve en el sitio se edita desde el panel. Esta tabla resume dónde se cambia cada cosa.

| Contenido | Se edita en | Se ve en |
| --- | --- | --- |
| Textos de la portada (titular, manifiesto, contacto, cifras) | Panel, "Textos del sitio" | Portada |
| CV en PDF (uno por idioma) | Panel, "Textos del sitio" | Botón "Descargar CV" |
| Disponibilidad ("Disponible desde noviembre") | Panel, "Textos del sitio" | Portada, contacto y modo reclutador |
| Proyectos | Panel, "Proyectos" | Portada, índice y página de cada proyecto |
| Experiencia | Panel, "Experiencia" | Línea de tiempo de la portada |
| Servicios | Panel, "Servicios" | Sección de servicios |
| Roadmap, ticker de tecnologías, clientes, testimonios, laboratorio, bitácora | Panel, una pantalla por cada uno | Su sección en la portada |
| Orden y visibilidad de las secciones | Panel, "Estructura de portada" | Portada |
| Fondo animado, intro, sonido, modo ligero | Panel, "Escena" | Todo el sitio |
| Mensajes de contacto | Panel, "Mensajes" | Solo en el panel |
| Comentarios | Panel, "Comentarios" | Sección de comentarios, una vez aprobados |

Todo lo que se escribe en el panel puede guardarse con `Ctrl + S`.

## 3. Proyectos

Es el contenido principal del sitio.

### Estados de un proyecto

| Marca | Significado |
| --- | --- |
| **Borrador / publicado** | Un proyecto nuevo nace como borrador y no se ve. Solo cuando se publica aparece en el sitio. |
| **Destacado** | Los destacados aparecen en la portada. Si no hay ninguno marcado, se muestran todos. |
| **En vivo / en curso / archivado** | El estado real del proyecto, visible como etiqueta. Es independiente de si está publicado. |
| **Tipo** | Web, 3D o herramienta. Sirve para los filtros. |

### Qué se ve en cada lugar

- **Portada:** como máximo **7 tarjetas**. Si hay más proyectos, el recorrido termina con una tarjeta "+N proyectos más" que lleva al índice. Así la portada nunca se vuelve interminable. En pantallas anchas las tarjetas pasan de lado mientras se hace scroll hacia abajo; en móvil se apilan.
- **Índice (`/proyectos`):** todos los proyectos publicados, con filtros por tipo, estado, tecnología y texto. Cada filtro muestra cuántos resultados da.
- **Página de proyecto:** una ficha completa. Sus secciones solo aparecen si tienen contenido.

### Secciones de la página de proyecto

Video demo, historia en tres pasos (problema, proceso, resultado), resultados con cifras, escritorio y móvil, puntos de interés sobre la imagen, resumen y tecnologías, "cómo está hecho", capítulos del caso de estudio, videos, pantallas, galería de fotos y extras (mejoras próximas, documentos y versiones). Al final siempre salen proyectos relacionados, que son los que comparten tecnologías.

- El **orden** de esas secciones lo elige Camilo en el panel ("Organizar la página"), arrastrándolas. Una sección vacía conserva su lugar pero no se muestra.
- La **historia** puede verse como línea de tiempo numerada o como una pantalla fija mientras pasan los pasos.
- Los **resultados** pueden verse como números grandes o como anillos que se llenan (los anillos solo funcionan con porcentajes o valores de 0 a 100).
- La **versión móvil** permite añadir un video vertical y hasta 6 capturas, que se muestran dentro de un teléfono.
- Los **puntos de interés** son hasta 8 marcas numeradas sobre la imagen de portada, cada una con su explicación.
- Los **capítulos** se componen libremente con seis tipos de bloque: texto, imagen, antes y después, cita, código y modelo 3D.

### Revisar antes de publicar

- **Vista previa en vivo** del proyecto mientras se edita.
- **Enlace privado de borrador**: permite enseñar un proyecto sin publicar a alguien (por ejemplo, para pedir su opinión). Solo funciona con su clave secreta, se puede renovar para anular enlaces anteriores y los buscadores lo ignoran.
- **Pendientes por proyecto** en el dashboard: lista lo que le falta a cada proyecto (imagen de tarjeta, enlaces, resumen, caso de estudio, ficha, cifras y traducción al inglés) y lleva directamente al paso que lo arregla. Los extras opcionales (videos, capítulos, versiones) no cuentan como pendiente.
- **Borrador local**: lo que se está escribiendo se guarda en el navegador, para no perderlo si se cierra la pestaña por error.

## 4. Otras secciones

| Sección | Qué es | Detalle |
| --- | --- | --- |
| **Experiencia** | Línea de tiempo de trabajos y formación | Cada entrada abre un detalle con logros y tecnologías. La actual se marca con un pulso. |
| **Servicios** | Qué ofrece como freelance | Cada servicio es una ficha: título, descripción, **plazo típico**, lista de **qué incluye**, precio o condición y un botón **"Cotizar esto"**. El plazo y la lista solo se muestran si tienen texto. |
| **Roadmap** | Qué viene | Etapas con momento, título y descripción. |
| **Ticker** | Franja de tecnologías | Se mueve más rápido al hacer scroll. |
| **Clientes** | Logos de "confían en mí" | No se muestra si está vacía. |
| **Testimonios** | Citas de clientes y colegas | No se muestra si está vacía. |
| **Laboratorio** | Experimentos cortos en video | Se reproducen solo mientras se ven. |
| **Bitácora** | Notas fechadas, como un registro | Tipos: ahora, lanzamiento, aprendiendo y nota. Se ordena por fecha. |

Las secciones vacías **no se pintan**: así el sitio nunca muestra huecos.

### "Cotizar esto"

Al pulsar el botón de un servicio se abre el formulario de contacto con el tema "Un proyecto" ya elegido y el mensaje empezado ("Me interesa el servicio X."). Si la sección de contacto está oculta, se abre el correo del visitante con el servicio en el asunto.

## 5. Dos idiomas

- El sitio está en **español e inglés**. El visitante cambia con el botón ES / EN y el cambio es inmediato.
- Los textos fijos de la interfaz salen de archivos de idioma.
- El contenido (proyectos, experiencia, servicios...) se guarda con una versión en cada idioma.
- **Regla de respaldo:** si falta la versión en inglés, se muestra la española. Nunca queda un hueco.
- En el panel, un **traductor asistido** rellena el inglés a partir del español. Solo escribe donde el inglés está vacío o todavía tiene una traducción automática sin editar: lo escrito a mano jamás se reemplaza.
- El dashboard y los "pendientes" indican qué textos aún no tienen versión en inglés.

## 6. Contacto

### Qué pasa cuando alguien escribe

```
Visitante rellena el formulario
        |
  Validación (nombre, correo, mensaje)
        |
  Se guarda en el sistema  +  se envía copia por correo
        |
  Aparece en "Mensajes" del panel como NUEVO
        |
  Camilo responde desde su correo y marca el estado
```

- **Datos que pide:** nombre, correo, tema (un proyecto, una oferta de trabajo u otra cosa) y mensaje (mínimo 10 caracteres).
- **Ayudas al visitante:** avisa si el correo parece tener una errata ("¿quisiste decir gmail.com?") y cuenta cuántos caracteres faltan.
- **Doble vía:** el mensaje se guarda siempre en el sistema y además llega por correo. Basta con que una de las dos vías funcione para dar el mensaje por recibido. Si ninguna funciona, el visitante ve el correo directo para escribir a mano.
- **Protección contra abuso:**
  - un campo trampa invisible que solo rellenan los bots (a ellos se les responde "enviado" para que no lo noten, pero el mensaje se descarta);
  - un límite de mensajes por hora por conexión y otro global;
  - de la conexión solo se guarda una huella cifrada, nunca la dirección.
- **Estados de una conversación:** nuevo, leído, respondido y archivado. Abrir un mensaje nuevo lo marca como leído. El botón de responder abre el correo con el asunto y el mensaje citado, y marca la conversación como respondida. El menú del panel muestra cuántos mensajes nuevos hay.

## 7. Comentarios

Es un libro de visitas con moderación previa.

1. El visitante escribe su nombre y su comentario.
2. El comentario **no se publica**: queda pendiente.
3. Camilo lo revisa en el panel y puede **aprobarlo**, **ocultarlo** o **borrarlo**. También puede aprobar varios a la vez.
4. Solo los aprobados se ven en el sitio.

Protecciones: campo trampa para bots, una espera de un minuto entre comentarios desde el mismo navegador y límites de longitud. Los comentarios nuevos aparecen en el panel en tiempo real.

## 8. Estadísticas

El sitio mide muy poco, y nada que identifique a una persona.

| Qué se mide | Para qué |
| --- | --- |
| Cada visita: la página y el idioma | Contar visitas de los últimos 30 días y qué idioma predomina. |
| Cada lectura de un proyecto: cuál, idioma, hasta dónde se leyó y cuántos segundos | Saber qué proyectos se abren y cuántos llegan al final del caso de estudio. |

Reglas:

- Las lecturas de menos de 2 segundos no cuentan (clics por error, botón atrás).
- Las lecturas del propio administrador con sesión iniciada no cuentan.
- Los borradores y la vista previa del panel no generan estadísticas.
- No hay cookies de seguimiento ni herramientas de terceros.

El dashboard muestra visitas por día, mensajes nuevos, comentarios pendientes, proyectos publicados, el reparto por idiomas y los proyectos más leídos.

## 9. Estructura de la portada

La portada es una lista de secciones que se puede reordenar y ocultar desde "Estructura de portada":

hero, manifiesto, proyectos, clientes, laboratorio, experiencia, testimonios, servicios, roadmap, bitácora, comentarios y contacto.

- Cada sección tiene un **interruptor de visibilidad**.
- El **orden** se cambia arrastrando.
- Además de las secciones fijas se pueden añadir **bloques personalizados** en cualquier posición: texto, rejilla de tarjetas, roadmap, bloque de cabecera o una galería 3D (con un modelo subido desde "Modelos 3D").
- Si el orden guardado no menciona alguna sección nueva, esta se añade en su lugar por defecto. La portada nunca queda rota por un orden incompleto.

## 10. Escena: cómo se comporta el sitio

Desde el panel, Camilo ajusta cómo "se siente" el sitio para todos los visitantes:

- anillos del fondo (completos, suaves u ocultos) y su ritmo (tranquilo, normal o vivo);
- lluvia de estrellas;
- tipo de transición al abrir un proyecto;
- intro de la primera visita (activada o no);
- sonido por defecto;
- modo ligero (automático o siempre activo).

Los cambios se previsualizan al momento en su navegador y llegan a los visitantes al guardar. Si sale sin guardar, se restaura la escena guardada.

### Modo ligero

En equipos modestos el sitio reduce solo los efectos más caros (brillos, lluvia, transiciones circulares) sin cambiar el contenido ni el diseño. Se activa automáticamente al detectar un equipo con pocos recursos o pocos fotogramas por segundo, y siempre que el visitante tenga activado "reducir movimiento" en su sistema.

## 11. Modo reclutador

Una página (`/reclutador`) pensada para quien revisa perfiles con prisa: nombre y rol, disponibilidad, botón de CV, cifras clave, tecnologías, hasta 3 proyectos destacados y la experiencia. Se imprime como una sola hoja limpia. Se llega desde el menú `Ctrl + K` o con el enlace `/?modo=reclutador`, pensado para compartir.

## 12. Privacidad y políticas

La página `/politicas` explica en español e inglés, y según la normativa colombiana de protección de datos (Ley 1581 de 2012):

- qué datos se recogen (solo los que el visitante envía por el formulario de contacto o por los comentarios, más las estadísticas anónimas);
- dónde se guardan y qué servicios intervienen;
- los derechos del visitante (conocer, corregir, borrar sus datos o presentar una queja) y cómo ejercerlos;
- qué guarda el navegador (tema, sonido, intro vista y similares) y que no hay cookies de seguimiento;
- la propiedad intelectual del sitio.

Si el sitio empieza a recoger datos nuevos, esa página y su fecha de actualización deben cambiarse.

## 13. Permisos

| Acción | Visitante | Administrador |
| --- | --- | --- |
| Ver contenido publicado | Sí | Sí |
| Ver borradores | Solo con el enlace privado | Sí |
| Enviar mensaje de contacto | Sí | Sí |
| Escribir comentario (queda pendiente) | Sí | Sí |
| Leer mensajes y comentarios pendientes | No | Sí |
| Crear, editar y borrar contenido | No | Sí |

Los permisos no dependen del navegador: los hace cumplir la propia base de datos, así que no se pueden saltar manipulando la página.

## 14. Reglas de negocio importantes

1. **Solo se ve lo publicado.** Un borrador no aparece en ninguna lista ni en el mapa del sitio.
2. **Nada se inventa.** Si falta un dato (fechas, métricas, textos), se deja vacío o marcado como pendiente; nunca se rellena con algo falso.
3. **Una sección vacía no se pinta.** No hay cajas vacías ni mensajes de relleno.
4. **El inglés siempre tiene respaldo en español.**
5. **Un comentario nunca es público sin aprobación.**
6. **Los mensajes nunca se pierden:** se guardan en el sistema aunque falle el correo.
7. **La portada muestra como máximo 7 proyectos;** el resto está en el índice.
8. **El rendimiento es un requisito, no un extra.** Toda mejora visual debe mantener el sitio fluido.
9. **Sin emojis** en ningún lugar del sitio.

## 15. Puesta a punto pendiente

Cosas que dependen de configuración externa y conviene tener resueltas antes de dar el sitio por terminado:

- **Clave de Web3Forms:** mientras esté vacía, los mensajes se guardan y se leen en el panel, pero **no llegan por correo**.
- **Migraciones de la base de datos:** los cambios de estructura se aplican a mano en el editor SQL de Supabase, en orden. Si una pantalla del panel avisa de que "falta aplicar la última migración", es esto.
- **Contenido de los servicios:** el plazo típico y la lista de "qué incluye" empiezan vacíos y hay que rellenarlos para que se vean.
- **Usuario administrador:** debe existir en Supabase (con su correo y contraseña) y estar dado de alta como administrador.
