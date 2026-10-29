// Lista los medios de public/media/projects (videos, imágenes, PDFs) para que el admin elija archivos
// sin subir nada. Corre antes de `npm start` y `npm run build` (prestart / prebuild), también en Vercel.
// scripts/media-server.mjs importa writeManifest() para refrescar la lista tras cada subida local.
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = 'public';
export const MEDIA_DIR = join(PUBLIC_DIR, 'media', 'projects');
const KINDS = [
  ['video', /\.(mp4|webm)$/i],
  ['image', /\.(jpe?g|png|webp|avif|gif)$/i],
  ['doc', /\.pdf$/i],
];

const kindOf = (name) => KINDS.find(([, pattern]) => pattern.test(name))?.[0];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : kindOf(entry.name) ? [full] : [];
  });
}

/** Escribe manifest.json y devuelve la lista que escribió. */
export function writeManifest() {
  mkdirSync(MEDIA_DIR, { recursive: true });
  const files = walk(MEDIA_DIR)
    .map((file) => ({
      path: '/' + relative(PUBLIC_DIR, file).split(sep).join('/'),
      kind: kindOf(file),
      bytes: statSync(file).size,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(join(MEDIA_DIR, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
  return files;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const files = writeManifest();
  const count = (kind) => files.filter((file) => file.kind === kind).length;
  console.log(`media-manifest: ${count('video')} video(s), ${count('image')} image(s), ${count('doc')} PDF(s) in ${MEDIA_DIR}`);
}
