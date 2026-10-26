/** Helpers for project URLs (slugs for /proyectos/<slug>). */

const SLUG_MAX = 80;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Cauce — Finanzas Ñandú" -> "cauce-finanzas-nandu" (same rule as the 0008 backfill). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}
