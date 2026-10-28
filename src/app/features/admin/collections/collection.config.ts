import { CollectionTable } from '../../../core/data/collections.service';

export interface CollectionField {
  /** Column base name; bilingual fields map to `<name>_es` / `<name>_en`. */
  name: string;
  label: string;
  bilingual: boolean;
  multiline?: boolean;
  /** `'es'`: only the Spanish column is required (English falls back to it on the site). */
  required?: boolean | 'es';
  /**
   * `image` uploads to Supabase Storage (previews bucket) and stores the public URL; `url` must start with http(s);
   * `video` picks or uploads (optimized) a file under public/media/projects/<mediaFolder>/; `select` uses `options`;
   * `date` stores YYYY-MM-DD.
   */
  kind?: 'text' | 'image' | 'url' | 'video' | 'select' | 'date';
  options?: { value: string; label: string }[];
  /** Initial value of a new item (select and date fields). `today` = current date. */
  defaultValue?: string;
  /** `video`: media folder, and the field that receives the poster generated on upload. */
  mediaFolder?: string;
  posterField?: string;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  /** Where the field shows on the public site, for the line under it. */
  where?: string;
}

export interface CollectionConfig {
  key: string;
  table: CollectionTable;
  /** Admin route segment, e.g. `services` -> `/admin/services`. */
  path: string;
  title: string;
  help: string;
  singular: string;
  newLabel: string;
  fields: CollectionField[];
  /** Icon for the page header and menu. */
  icon: string;
  /** Section on the public page, for "Ver en el sitio" (empty: top of the page). */
  siteAnchor: string;
  /** Column shown as the row title in the list (Spanish side when bilingual). */
  listTitle: string;
  /** Optional second column in the list. */
  listDetail?: string;
  /** Migration that creates the table, named in the load error (default 0005_site_content.sql). */
  migration?: string;
}

export const COLLECTIONS: Record<string, CollectionConfig> = {
  services: {
    key: 'services',
    table: 'services',
    path: 'services',
    icon: 'tag',
    siteAnchor: '#services',
    title: 'Servicios',
    help: 'Las tarjetas de la sección Servicios. Arrastra para ordenar; el interruptor publica u oculta cada una.',
    singular: 'servicio',
    newLabel: 'NUEVO SERVICIO',
    fields: [
      { name: 'title', label: 'Título', bilingual: true, required: true, maxLength: 120, placeholder: 'WEB APPS', where: 'título de la tarjeta en Servicios' },
      { name: 'description', label: 'Descripción', bilingual: true, multiline: true, maxLength: 1000, where: 'texto de la tarjeta en Servicios' },
      { name: 'price', label: 'Precio o condición', bilingual: true, maxLength: 120, placeholder: 'DESDE · COTIZACIÓN POR ALCANCE', hint: 'Si queda vacío no se muestra.', where: 'tarjeta en Servicios' },
    ],
    listTitle: 'title_es',
    listDetail: 'price_es',
  },
  roadmap: {
    key: 'roadmap',
    table: 'roadmap_items',
    path: 'roadmap',
    icon: 'map',
    siteAnchor: '#roadmap',
    title: 'Roadmap',
    help: 'Las tarjetas de la sección Roadmap. Arrastra para ordenar; el interruptor publica u oculta cada una.',
    singular: 'etapa',
    newLabel: 'NUEVA ETAPA',
    fields: [
      { name: 'when', label: 'Momento o estado', bilingual: true, maxLength: 60, placeholder: 'NOW · 2026', where: 'etiqueta de la etapa en Roadmap' },
      { name: 'title', label: 'Título', bilingual: true, required: true, maxLength: 120, where: 'título de la etapa en Roadmap' },
      { name: 'description', label: 'Descripción', bilingual: true, multiline: true, maxLength: 1000, where: 'texto de la etapa en Roadmap' },
    ],
    listTitle: 'title_es',
    listDetail: 'when_es',
  },
  ticker: {
    key: 'ticker',
    table: 'ticker_items',
    path: 'ticker',
    icon: 'rows',
    siteAnchor: '',
    title: 'Ticker',
    help: 'Las tecnologías de la franja animada bajo el hero. Mismo texto en ambos idiomas.',
    singular: 'tecnología',
    newLabel: 'NUEVA TECNOLOGÍA',
    fields: [
      { name: 'label', label: 'Nombre', bilingual: false, required: true, maxLength: 40, placeholder: 'Angular', where: 'franja animada bajo el hero' },
    ],
    listTitle: 'label',
  },
  clients: {
    key: 'clients',
    table: 'clients',
    path: 'clients',
    icon: 'users',
    siteAnchor: '#clients',
    title: 'Clientes',
    help: 'Los logos de la franja "Han confiado en mí". Usa solo clientes o empresas que te hayan dado permiso. Si no hay ninguno publicado, la franja no aparece.',
    singular: 'cliente',
    newLabel: 'NUEVO CLIENTE',
    fields: [
      { name: 'name', label: 'Nombre', bilingual: false, required: true, maxLength: 80, placeholder: 'Velamentum', where: 'texto alternativo del logo (o el nombre si no hay logo)' },
      {
        name: 'logo', label: 'Logo', bilingual: false, kind: 'image', maxLength: 2000,
        hint: 'PNG o WebP con fondo transparente, idealmente en una sola tinta. Se muestra en gris claro y toma su color al pasar el ratón. Sin logo se muestra el nombre.',
      },
      { name: 'url', label: 'Enlace', bilingual: false, kind: 'url', maxLength: 2000, placeholder: 'https://...', hint: 'Opcional. El logo abre esta web.' },
    ],
    listTitle: 'name',
    listDetail: 'url',
    migration: '0012_clients_testimonials.sql',
  },
  testimonials: {
    key: 'testimonials',
    table: 'testimonials',
    path: 'testimonials',
    icon: 'quote',
    siteAnchor: '#testimonials',
    title: 'Testimonios',
    help: 'Citas reales de clientes o compañeros, con su permiso. Si no hay ninguna publicada, la sección no aparece.',
    singular: 'testimonio',
    newLabel: 'NUEVO TESTIMONIO',
    fields: [
      {
        name: 'quote', label: 'Cita', bilingual: true, multiline: true, required: 'es', maxLength: 600, where: 'tarjeta en Testimonios',
        hint: 'Obligatoria en español; si dejas vacía la versión en inglés se muestra la española.',
      },
      { name: 'author', label: 'Nombre', bilingual: false, required: true, maxLength: 80, where: 'tarjeta en Testimonios' },
      { name: 'role', label: 'Cargo', bilingual: true, maxLength: 120, placeholder: 'Product Owner', where: 'bajo el nombre' },
      { name: 'company', label: 'Empresa', bilingual: false, maxLength: 80, where: 'bajo el nombre' },
      { name: 'photo', label: 'Foto', bilingual: false, kind: 'image', maxLength: 2000, hint: 'Opcional. Cuadrada, se muestra en círculo pequeño. Sin foto se muestran sus iniciales.' },
    ],
    listTitle: 'author',
    listDetail: 'company',
    migration: '0012_clients_testimonials.sql',
  },
  lab: {
    key: 'lab',
    table: 'lab_items',
    path: 'lab',
    icon: 'aperture',
    siteAnchor: '#lab',
    title: 'Laboratorio',
    help: 'Experimentos cortos: microinteracciones, pruebas 3D, prototipos de animación. Cada uno es un clip en bucle que solo se reproduce mientras se ve. Si no hay ninguno publicado, la sección no aparece.',
    singular: 'experimento',
    newLabel: 'NUEVO EXPERIMENTO',
    fields: [
      { name: 'title', label: 'Título', bilingual: true, required: 'es', maxLength: 120, placeholder: 'Botón magnético', where: 'tarjeta en Laboratorio' },
      { name: 'description', label: 'Qué explora', bilingual: true, multiline: true, maxLength: 600, where: 'tarjeta en Laboratorio' },
      {
        name: 'video', label: 'Clip', bilingual: false, required: true, kind: 'video', mediaFolder: 'lab', posterField: 'poster', maxLength: 500,
        hint: 'De 3 a 10 segundos, sin sonido. Al subirlo desde el dispositivo se optimiza y se genera el póster solo.',
      },
      { name: 'poster', label: 'Póster', bilingual: false, kind: 'image', maxLength: 2000, hint: 'Se rellena solo al subir el clip; puedes cambiarlo.' },
      { name: 'tags', label: 'Etiquetas', bilingual: false, maxLength: 200, placeholder: 'CSS, Three.js, GSAP', hint: 'Separadas por comas.', where: 'chips de la tarjeta' },
      { name: 'url', label: 'Demo o código', bilingual: false, kind: 'url', maxLength: 2000, placeholder: 'https://codepen.io/...', hint: 'Opcional. La tarjeta enlaza aquí.' },
    ],
    listTitle: 'title_es',
    listDetail: 'tags',
    migration: '0014_lab_log_analytics_previews.sql',
  },
  log: {
    key: 'log',
    table: 'log_entries',
    path: 'log',
    icon: 'activity',
    siteAnchor: '#log',
    title: 'Bitácora',
    help: 'Notas cortas: en qué trabajas, lanzamientos, aprendizajes. La portada muestra las más recientes por fecha como un registro HUD. Si no hay ninguna publicada, la sección no aparece.',
    singular: 'nota',
    newLabel: 'NUEVA NOTA',
    fields: [
      {
        name: 'kind', label: 'Tipo', bilingual: false, kind: 'select', maxLength: 12,
        options: [
          { value: 'now', label: 'Ahora · en qué trabajo' },
          { value: 'launch', label: 'Lanzamiento' },
          { value: 'learning', label: 'Aprendizaje' },
          { value: 'note', label: 'Nota' },
        ],
      },
      { name: 'entry_date', label: 'Fecha', bilingual: false, required: true, kind: 'date', defaultValue: 'today', maxLength: 10 },
      { name: 'text', label: 'Texto', bilingual: true, multiline: true, required: 'es', maxLength: 280, where: 'línea del registro en la portada' },
      { name: 'url', label: 'Enlace', bilingual: false, kind: 'url', maxLength: 2000, placeholder: 'https://...', hint: 'Opcional.' },
    ],
    listTitle: 'text_es',
    listDetail: 'entry_date',
    migration: '0014_lab_log_analytics_previews.sql',
  },
};

/** Column names a config writes, used to build the form and the payload. */
export function collectionColumns(config: CollectionConfig): string[] {
  return config.fields.flatMap((field) => (field.bilingual ? [`${field.name}_es`, `${field.name}_en`] : [field.name]));
}
