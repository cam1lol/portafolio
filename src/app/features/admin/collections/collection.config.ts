import { CollectionTable } from '../../../core/data/collections.service';

export interface CollectionField {
  /** Column base name; bilingual fields map to `<name>_es` / `<name>_en`. */
  name: string;
  label: string;
  bilingual: boolean;
  multiline?: boolean;
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  hint?: string;
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
  /** Column shown as the row title in the list (Spanish side when bilingual). */
  listTitle: string;
  /** Optional second column in the list. */
  listDetail?: string;
}

export const COLLECTIONS: Record<string, CollectionConfig> = {
  services: {
    key: 'services',
    table: 'services',
    path: 'services',
    title: 'Servicios',
    help: 'Las tarjetas de la sección Servicios. Arrastra para ordenar; el interruptor publica u oculta cada una.',
    singular: 'servicio',
    newLabel: 'NUEVO SERVICIO',
    fields: [
      { name: 'title', label: 'Título', bilingual: true, required: true, maxLength: 120, placeholder: 'WEB APPS' },
      { name: 'description', label: 'Descripción', bilingual: true, multiline: true, maxLength: 1000 },
      { name: 'price', label: 'Precio o condición', bilingual: true, maxLength: 120, placeholder: 'DESDE · COTIZACIÓN POR ALCANCE', hint: 'Opcional. Si queda vacío no se muestra.' },
    ],
    listTitle: 'title_es',
    listDetail: 'price_es',
  },
  roadmap: {
    key: 'roadmap',
    table: 'roadmap_items',
    path: 'roadmap',
    title: 'Roadmap',
    help: 'Las tarjetas de la sección Roadmap. Arrastra para ordenar; el interruptor publica u oculta cada una.',
    singular: 'etapa',
    newLabel: 'NUEVA ETAPA',
    fields: [
      { name: 'when', label: 'Momento o estado', bilingual: true, maxLength: 60, placeholder: 'NOW · 2026' },
      { name: 'title', label: 'Título', bilingual: true, required: true, maxLength: 120 },
      { name: 'description', label: 'Descripción', bilingual: true, multiline: true, maxLength: 1000 },
    ],
    listTitle: 'title_es',
    listDetail: 'when_es',
  },
  ticker: {
    key: 'ticker',
    table: 'ticker_items',
    path: 'ticker',
    title: 'Ticker',
    help: 'Las tecnologías de la franja animada bajo el hero. Mismo texto en ambos idiomas.',
    singular: 'tecnología',
    newLabel: 'NUEVA TECNOLOGÍA',
    fields: [
      { name: 'label', label: 'Nombre', bilingual: false, required: true, maxLength: 40, placeholder: 'Angular' },
    ],
    listTitle: 'label',
  },
};

/** Column names a config writes, used to build the form and the payload. */
export function collectionColumns(config: CollectionConfig): string[] {
  return config.fields.flatMap((field) => (field.bilingual ? [`${field.name}_es`, `${field.name}_en`] : [field.name]));
}
