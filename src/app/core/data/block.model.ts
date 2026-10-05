/**
 * Mirrors the Supabase `blocks` table (Fase 4.7), mapped from snake_case to
 * camelCase by `BlocksService`. `config` shape depends on `type` and is
 * documented in `docs/superpowers/plans/2026-06-25-phase4-admin-plan.md`
 * (Fase 4.7, punto 3):
 * - `text`: { title?, body }
 * - `card_grid`: { title?, items: { title, description, icon? }[] }
 * - `roadmap`: { title?, items: { when, title, description }[] }
 * - `hero`: { eyebrow?, title, lead? }
 * - `gallery_3d`: { title?, description? } (placeholder de texto, sin geometría 3D)
 */
export interface Block {
  id: string;
  type: 'hero' | 'card_grid' | 'roadmap' | 'text' | 'gallery_3d';
  page: string;
  config: Record<string, unknown>;
  sortOrder: number;
  published: boolean;
}
