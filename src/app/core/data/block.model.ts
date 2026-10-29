/**
 * Refleja la tabla `blocks` de Supabase; `BlocksService` la pasa de snake_case a camelCase. La forma
 * de `config` depende de `type`:
 * - `text`: { title?, body }
 * - `card_grid`: { title?, items: { title, description, icon? }[] }
 * - `roadmap`: { title?, items: { when, title, description }[] }
 * - `hero`: { eyebrow?, title, lead? }
 * - `gallery_3d`: { title?, description?, modelPath } (ruta de un GLB autocontenido en Storage)
 */
export interface Block {
  id: string;
  type: 'hero' | 'card_grid' | 'roadmap' | 'text' | 'gallery_3d';
  page: string;
  config: Record<string, unknown>;
  sortOrder: number;
  published: boolean;
}
