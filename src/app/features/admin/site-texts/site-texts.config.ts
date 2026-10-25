export interface SiteTextField {
  /** `site_content.key`; same name as the i18n key when one exists. */
  key: string;
  label: string;
  bilingual: boolean;
  maxLength: number;
  multiline?: boolean;
  /** Accepts the inline markup rendered by `InlineMarkupPipe`. */
  markup?: boolean;
  kind?: 'text' | 'number' | 'email';
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
    help: 'Título y descripción corta que acompañan a Proyectos, Experiencia, Servicios y Roadmap.',
    fields: [
      { key: 'wk_h', label: 'Proyectos · título', bilingual: true, maxLength: 60 },
      { key: 'wk_d', label: 'Proyectos · descripción', bilingual: true, maxLength: 160 },
      { key: 'xp_h', label: 'Experiencia · título', bilingual: true, maxLength: 60 },
      { key: 'xp_d', label: 'Experiencia · descripción', bilingual: true, maxLength: 160 },
      { key: 'sv_h', label: 'Servicios · título', bilingual: true, maxLength: 60 },
      { key: 'sv_d', label: 'Servicios · descripción', bilingual: true, maxLength: 160 },
      { key: 'rd_h', label: 'Roadmap · título', bilingual: true, maxLength: 60 },
      { key: 'rd_d', label: 'Roadmap · descripción', bilingual: true, maxLength: 160 },
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
