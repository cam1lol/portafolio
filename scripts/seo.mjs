// Corre después de `npm run build` (postbuild): pone el dominio de producción en las etiquetas de vista
// previa de enlaces del index.html compilado y escribe sitemap.xml y robots.txt a su lado.
//
// Dominio: SITE_URL (p. ej. https://camiloayala.dev) o, en Vercel, VERCEL_PROJECT_PRODUCTION_URL (se
// pone sola). Sin ninguno, las etiquetas usan URLs relativas y no se genera el sitemap. Las páginas de
// proyecto salen de Supabase (públicas, solo las publicadas); si falla, el sitemap lista igual las páginas fijas.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// SEO_OUT lo apunta a otra carpeta de build (para probarlo sin tocar dist/).
const OUT = [process.env.SEO_OUT, 'dist/portafolio-front/browser', 'dist/browser', 'dist'].find((dir) => dir && existsSync(join(dir, 'index.html')));
if (!OUT) {
  console.warn('seo: no built index.html found, nothing to do');
  process.exit(0);
}

const fromEnv = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
const site = fromEnv.replace(/\/+$/, '');

// 1. Etiquetas de vista previa de enlaces
const indexPath = join(OUT, 'index.html');
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replaceAll('__SITE_URL__', site));
console.log(`seo: preview tags use ${site || 'relative URLs (set SITE_URL for absolute ones)'}`);

if (!site) process.exit(0);

// 2. sitemap.xml + robots.txt
async function projectSlugs() {
  try {
    const env = readFileSync('src/environments/environment.ts', 'utf8');
    const url = env.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
    const key = env.match(/(?:supabasePublishableKey|supabaseAnonKey):\s*'([^']+)'/)?.[1];
    if (!url || !key) return [];
    const res = await fetch(`${url}/rest/v1/projects?select=slug&published=eq.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) return [];
    return (await res.json()).map((row) => row.slug).filter(Boolean);
  } catch {
    return [];
  }
}

const slugs = await projectSlugs();
const paths = ['/', '/proyectos', '/reclutador', ...slugs.map((slug) => `/proyectos/${encodeURIComponent(slug)}`)];
const today = new Date().toISOString().slice(0, 10);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  paths.map((path) => `  <url><loc>${site}${path}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  '\n</urlset>\n';
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`seo: sitemap.xml with ${paths.length} pages (${slugs.length} projects), robots.txt`);
