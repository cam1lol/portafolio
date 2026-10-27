export interface SiteTextField {
  /** `site_content.key`; same name as the i18n key when one exists. */
  key: string;
  label: string;
  bilingual: boolean;
  maxLength: number;
  multiline?: boolean;
  /** Accepts the inline markup rendered by `InlineMarkupPipe`. */
  markup?: boolean;
  /** `select` uses `options`; `pdf` uploads a file to Supabase Storage and stores its public URL. */
  kind?: 'text' | 'number' | 'email' | 'select' | 'pdf';
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  /** Value shown when neither Supabase nor i18n has one (keys that never lived in i18n). */
  fallback?: string;
  /** Do not prefill from i18n; show it as a reference instead (used for the pending contact email). */
  referenceI18nKey?: string;
}

export interface SiteTextGroup {
  id: string;
  title: string;
  help: string;
  fields: SiteTextField[];
}

export const SITE_TEXT_GROUPS: SiteTextGroup[] = [
  {
    id: 'hero',
    title: 'Hero',
    help: 'La primera pantalla: etiqueta, título en tres líneas, introducción, cifras y botones.',
    fields: [
      { key: 'hero_eyebrow', label: 'Etiqueta superior', bilingual: true, maxLength: 80 },
      { key: 'hero_l1', label: 'Título · línea 1', bilingual: true, maxLength: 40 },
      { key: 'hero_l2', label: 'Título · línea 2', bilingual: true, maxLength: 40, hint: 'Esta línea se dibuja solo con contorno.' },
      { key: 'hero_l3', label: 'Título · línea 3', bilingual: true, maxLength: 40 },
      { key: 'hero_lead', label: 'Introducción', bilingual: true, maxLength: 400, multiline: true },
      { key: 'm1k', label: 'Cifra 1 · etiqueta', bilingual: true, maxLength: 30 },
      { key: 'hero_m1_value', label: 'Cifra 1 · número', bilingual: false, maxLength: 5, kind: 'number', fallback: '3' },
      { key: 'm1u', label: 'Cifra 1 · unidad', bilingual: true, maxLength: 20 },
      { key: 'm2k', label: 'Cifra 2 · etiqueta', bilingual: true, maxLength: 30 },
      { key: 'hero_m2_value', label: 'Cifra 2 · número', bilingual: false, maxLength: 5, kind: 'number', fallback: '11' },
      { key: 'm3k', label: 'Cifra 3 · etiqueta', bilingual: true, maxLength: 30 },
      { key: 'hero_m3_value', label: 'Cifra 3 · número', bilingual: false, maxLength: 5, kind: 'number', fallback: '14' },
      { key: 'cta1', label: 'Botón principal', bilingual: true, maxLength: 40 },
      { key: 'cta2', label: 'Botón secundario', bilingual: true, maxLength: 40 },
    ],
  },
  {
    id: 'availability',
    title: 'Disponibilidad',
    help: 'La etiqueta con un punto de color que aparece en el hero y en Contacto. Elige "Ocultar" o deja el texto vacío para no mostrarla.',
    fields: [
      {
        key: 'availability_state',
        label: 'Estado',
        bilingual: false,
        maxLength: 10,
        kind: 'select',
        fallback: 'hidden',
        options: [
          { value: 'open', label: 'Disponible · punto verde' },
          { value: 'limited', label: 'Agenda limitada · punto naranja' },
          { value: 'closed', label: 'No disponible · punto gris' },
          { value: 'hidden', label: 'Ocultar' },
        ],
      },
      {
        key: 'availability_text',
        label: 'Texto',
        bilingual: true,
        maxLength: 80,
        placeholder: 'Disponible para proyectos desde noviembre',
        hint: 'Corto y concreto: qué buscas y desde cuándo.',
      },
    ],
  },
  {
    id: 'cv',
    title: 'CV',
    help: 'El PDF que descarga el botón "Descargar CV" del hero y de Experiencia, según el idioma activo. Si falta el de inglés se descarga el de español; sin ninguno, el botón no aparece.',
    fields: [{ key: 'cv_url', label: 'Hoja de vida (PDF, máx. 10 MB)', bilingual: true, maxLength: 2000, kind: 'pdf' }],
  },
  {
    id: 'manifesto',
    title: 'Manifiesto',
    help: 'El párrafo grande bajo el hero.',
    fields: [
      { key: 'ab_h', label: 'Título de sección', bilingual: true, maxLength: 60 },
      { key: 'ab_d', label: 'Descripción de sección', bilingual: true, maxLength: 160 },
      { key: 'ab_body', label: 'Texto', bilingual: true, maxLength: 1200, multiline: true, markup: true },
    ],
  },
  {
    id: 'heads',
    title: 'Encabezados de sección',
    help: 'Título y descripción corta que acompañan a Proyectos, Experiencia, Clientes, Testimonios, Servicios, Roadmap y Comentarios.',
    fields: [
      { key: 'wk_h', label: 'Proyectos · título', bilingual: true, maxLength: 60 },
      { key: 'wk_d', label: 'Proyectos · descripción', bilingual: true, maxLength: 160 },
      { key: 'xp_h', label: 'Experiencia · título', bilingual: true, maxLength: 60 },
      { key: 'xp_d', label: 'Experiencia · descripción', bilingual: true, maxLength: 160 },
      { key: 'sv_h', label: 'Servicios · título', bilingual: true, maxLength: 60 },
      { key: 'sv_d', label: 'Servicios · descripción', bilingual: true, maxLength: 160 },
      { key: 'rd_h', label: 'Roadmap · título', bilingual: true, maxLength: 60 },
      { key: 'rd_d', label: 'Roadmap · descripción', bilingual: true, maxLength: 160 },
      { key: 'cl_h', label: 'Clientes · etiqueta de la franja', bilingual: true, maxLength: 60 },
      { key: 'ts_h', label: 'Testimonios · título', bilingual: true, maxLength: 60 },
      { key: 'ts_d', label: 'Testimonios · descripción', bilingual: true, maxLength: 160 },
      { key: 'cm_h', label: 'Comentarios · título', bilingual: true, maxLength: 60 },
      { key: 'cm_d', label: 'Comentarios · descripción', bilingual: true, maxLength: 160 },
    ],
  },
  {
    id: 'contact',
    title: 'Contacto',
    help: 'El cierre de la página y el botón de email.',
    fields: [
      { key: 'contact_eyebrow', label: 'Etiqueta superior', bilingual: false, maxLength: 60, fallback: "// LET'S BUILD" },
      { key: 'ct_h', label: 'Título', bilingual: true, maxLength: 80, multiline: true, markup: true },
      { key: 'ct_l', label: 'Texto', bilingual: true, maxLength: 300, multiline: true },
      {
        key: 'contact_email',
        label: 'Email de contacto',
        bilingual: false,
        maxLength: 120,
        kind: 'email',
        referenceI18nKey: 'ct_b',
        hint: 'El botón abre el correo con esta dirección. Si lo dejas vacío se sigue mostrando el valor del archivo de traducciones.',
      },
    ],
  },
];
