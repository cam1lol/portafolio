/** Utilidades para las URLs de proyectos (slugs de /proyectos/<slug>). */

const SLUG_MAX = 80;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Cauce — Finanzas Ñandú" -> "cauce-finanzas-nandu" (la misma regla que el relleno de la 0008). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita las tildes que deja NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}
