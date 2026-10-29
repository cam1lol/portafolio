// Subidas solo en local para el admin (lo arranca proxy.conf.mjs dentro de `ng serve`). Recibe un archivo
// del panel, lo optimiza con ffmpeg, lo guarda en public/media/projects/<slug>/ y refresca manifest.json.
// Escucha solo en 127.0.0.1 y nunca se despliega: en producción el panel solo lista los archivos que ya
// están en el repositorio. Sin dependencias npm: node:http más los binarios de ffmpeg/ffprobe.
//
//   video  -> <nombre>.mp4 (H.264 + AAC, máx. 1920x1080, inicio rápido), <nombre>.poster.webp, <nombre>.preview.mp4 (6 s, 480p, sin audio)
//   imagen -> <nombre>.webp (máx. 1920 px); los GIF se copian tal cual (pueden ser animados)
//   pdf    -> se copia tal cual
import { createServer } from 'node:http';
import { createReadStream, createWriteStream, existsSync, readdirSync, statSync, copyFileSync, mkdirSync, rmSync, openSync, readSync, closeSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, basename, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { MEDIA_DIR, writeManifest } from './media-manifest.mjs';

const PORT = Number(process.env.MEDIA_PORT || 4310);
const MB = 1024 * 1024;
const LIMITS = { video: 2048 * MB, image: 50 * MB, doc: 50 * MB };
const ACCEPTED = {
  video: /\.(mp4|mov|m4v|webm|mkv|avi)$/i,
  image: /\.(jpe?g|png|webp|avif|gif|bmp|tiff?)$/i,
  doc: /\.pdf$/i,
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---- Buscar ffmpeg: primero en el PATH y luego en la carpeta de paquetes de WinGet (una instalación nueva no está en el PATH hasta abrir otra terminal).

function findBinary(name) {
  const fromEnv = process.env[`${name.toUpperCase()}_PATH`];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  if (spawnSync(name, ['-version'], { stdio: 'ignore' }).status === 0) return name;
  const packages = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
  return packages && existsSync(packages) ? searchFile(packages, `${name}.exe`, 4) : null;
}

function searchFile(dir, file, depth) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === file) return full;
    if (entry.isDirectory() && depth > 0) {
      const found = searchFile(full, file, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

const FFMPEG = findBinary('ffmpeg');
const FFPROBE = findBinary('ffprobe');

function run(bin, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err = (err + chunk).slice(-2000)));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolvePromise(out) : reject(new Error(err.trim() || `${bin} exited with ${code}`))));
  });
}

async function probe(file) {
  const json = JSON.parse(await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]));
  const video = json.streams?.find((s) => s.codec_type === 'video');
  if (!video) return null;
  // ffmpeg aplica la rotación al decodificar, así un video vertical de móvil se mide en su orientación real.
  const rotation = Math.abs(Number(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? video.tags?.rotate ?? 0));
  const turned = rotation % 180 === 90;
  return {
    width: turned ? video.height : video.width,
    height: turned ? video.width : video.height,
    duration: Number(json.format?.duration ?? video.duration ?? 0),
    hasAudio: json.streams.some((s) => s.codec_type === 'audio'),
  };
}

// ---- Tamaños y nombres

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/** Reduce (nunca amplía) para que el lado largo quepa en maxLong y el corto en maxShort. */
function fit(width, height, maxLong, maxShort) {
  const factor = Math.min(1, maxLong / Math.max(width, height), maxShort / Math.min(width, height));
  return [even(width * factor), even(height * factor)];
}

function formatDuration(seconds) {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function safeBase(name) {
  const base = basename(name, extname(name))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'archivo';
}

/** El primer "nombre", "nombre-2"... cuyas salidas aún no existen, así una subida nunca sobrescribe un archivo. */
function uniqueBase(dir, base) {
  const taken = (b) => ['.mp4', '.poster.webp', '.preview.mp4', '.webp', '.gif', '.pdf'].some((suffix) => existsSync(join(dir, b + suffix)));
  let candidate = base;
  for (let n = 2; taken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

const publicPath = (file) => '/' + file.split(/[\\/]/).slice(1).join('/'); // quita "public"
const size = (file) => statSync(file).size;

// ---- Optimizadores

async function optimizeVideo(input, dir, base) {
  const info = await probe(input);
  if (!info) throw new UserError('El archivo no tiene una pista de video.');
  const [w, h] = fit(info.width, info.height, 1920, 1080);
  const out = join(dir, `${base}.mp4`);
  const preview = join(dir, `${base}.preview.mp4`);
  const poster = join(dir, `${base}.poster.webp`);
  const quiet = ['-y', '-hide_banner', '-loglevel', 'error'];

  await run(FFMPEG, [
    ...quiet, '-i', input, '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    ...(info.hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : []),
    '-movflags', '+faststart', out,
  ]);

  // Clip de hover: unos segundos del principio del video, pequeño y sin sonido.
  const start = info.duration > 12 ? Math.min(3, info.duration * 0.1) : 0;
  const [pw, ph] = fit(w, h, 854, 480);
  await run(FFMPEG, [
    ...quiet, '-ss', String(start), '-t', String(Math.min(6, info.duration || 6)), '-i', out, '-an',
    '-vf', `scale=${pw}:${ph}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview,
  ]);

  const [tw, th] = fit(w, h, 1280, 720);
  await run(FFMPEG, [
    ...quiet, '-ss', String(Math.min(1, info.duration / 3)), '-i', out, '-frames:v', '1',
    '-vf', `scale=${tw}:${th}`, '-c:v', 'libwebp', '-quality', '78', poster,
  ]);

  return { path: publicPath(out), poster: publicPath(poster), preview: publicPath(preview), duration: formatDuration(info.duration), bytesOut: size(out) };
}

async function optimizeImage(input, dir, base, originalName) {
  if (/\.gif$/i.test(originalName)) {
    const out = join(dir, `${base}.gif`);
    copyFileSync(input, out);
    return { path: publicPath(out), bytesOut: size(out) };
  }
  const info = await probe(input);
  if (!info) throw new UserError('No se pudo leer la imagen.');
  const [w, h] = fit(info.width, info.height, 1920, 1920);
  const out = join(dir, `${base}.webp`);
  await run(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-frames:v', '1', '-vf', `scale=${w}:${h}:flags=lanczos`, '-c:v', 'libwebp', '-quality', '80', out]);
  return { path: publicPath(out), bytesOut: size(out) };
}

function copyPdf(input, dir, base) {
  const header = Buffer.alloc(5);
  const fd = openSync(input, 'r');
  readSync(fd, header, 0, 5, 0);
  closeSync(fd);
  if (header.toString('latin1') !== '%PDF-') throw new UserError('El archivo no es un PDF válido.');
  const out = join(dir, `${base}.pdf`);
  copyFileSync(input, out);
  return { path: publicPath(out), bytesOut: size(out) };
}

// ---- HTTP

/** Una optimización a la vez: ffmpeg ya usa todos los núcleos. */
let queue = Promise.resolve();
const enqueue = (job) => {
  const result = queue.then(job);
  queue = result.catch(() => undefined);
  return result;
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleUpload(req, res, url) {
  const slug = url.searchParams.get('slug') ?? '';
  const kind = url.searchParams.get('kind') ?? '';
  const name = url.searchParams.get('name') ?? '';
  if (!SLUG.test(slug) || slug.length > 80) throw new UserError('Slug no válido: escribe primero el slug del proyecto.');
  if (!(kind in LIMITS)) throw new UserError('Tipo de archivo no válido.');
  if (!ACCEPTED[kind].test(name)) throw new UserError(`Formato no admitido para ${kind === 'doc' ? 'documentos (solo PDF)' : kind === 'video' ? 'video' : 'imagen'}.`);
  if (kind !== 'doc' && !FFMPEG) throw new UserError('No se encontró ffmpeg. Instálalo (winget install Gyan.FFmpeg) y reinicia npm start.', 503);
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > LIMITS[kind]) throw new UserError(`El archivo supera el máximo de ${LIMITS[kind] / MB} MB.`, 413);

  const temp = join(tmpdir(), `portfolio-upload-${randomUUID()}${extname(name).toLowerCase()}`);
  try {
    let received = 0;
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > LIMITS[kind]) req.destroy(new UserError(`El archivo supera el máximo de ${LIMITS[kind] / MB} MB.`, 413));
    });
    await pipeline(req, createWriteStream(temp));
    if (!received) throw new UserError('El archivo está vacío.');

    const result = await enqueue(async () => {
      const dir = join(MEDIA_DIR, slug);
      mkdirSync(dir, { recursive: true });
      const base = uniqueBase(dir, safeBase(name));
      const started = Date.now();
      const output =
        kind === 'video' ? await optimizeVideo(temp, dir, base)
        : kind === 'image' ? await optimizeImage(temp, dir, base, name)
        : copyPdf(temp, dir, base);
      console.log(`media-server: ${name} -> ${output.path} (${(received / MB).toFixed(1)} MB -> ${(output.bytesOut / MB).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(1)} s)`);
      return output;
    });
    send(res, 200, { ...result, bytesIn: received, manifest: writeManifest() });
  } finally {
    rmSync(temp, { force: true });
  }
}

// ---- Archivos estáticos. En desarrollo `ng serve` no sirve public/media/projects (angular.json lo ignora,
// para que las subidas nuevas no recarguen la página a mitad de formulario); el proxy manda esas peticiones aquí.

const TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.pdf': 'application/pdf', '.json': 'application/json',
};
const MEDIA_ROOT = resolve(MEDIA_DIR);

function serveStatic(req, res, pathname) {
  let file;
  try {
    file = resolve(MEDIA_ROOT, '.' + decodeURIComponent(pathname.replace(/^\/media\/projects/, '')));
  } catch {
    return send(res, 400, { error: 'Ruta no válida.' });
  }
  if (!file.startsWith(MEDIA_ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) return send(res, 404, { error: 'No encontrado.' });

  const total = statSync(file).size;
  const headers = { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  // Las peticiones Range dejan al navegador empezar un video y saltar sin descargarlo entero.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start > end || start >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': total });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

/** Sin Origin (curl, GET del mismo origen) o uno servido desde esta máquina (la app de ng serve en cualquier puerto). */
function isLocalOrigin(origin) {
  if (!origin) return true;
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const route = url.pathname.replace(/^\/__media/, '');
  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/media/projects/')) return serveStatic(req, res, url.pathname);
    if (req.method === 'GET' && route === '/health') return send(res, 200, { ok: true, ffmpeg: !!FFMPEG && !!FFPROBE });
    if (req.method === 'POST' && route === '/upload') {
      // Cualquier página abierta en el navegador podría hacer POST aquí mientras corre npm start. La cabecera
      // propia obliga a una comprobación CORS previa que este servidor nunca aprueba, y la comprobación de
      // Origin rechaza otros sitios.
      if (req.headers['x-media-upload'] !== '1' || !isLocalOrigin(req.headers.origin)) return send(res, 403, { error: 'Solo se aceptan subidas desde el panel local.' });
      return await handleUpload(req, res, url);
    }
    send(res, 404, { error: 'Ruta no encontrada.' });
  } catch (error) {
    const status = error instanceof UserError ? error.status : 500;
    if (status === 500) console.error('media-server:', error);
    const message = error instanceof UserError ? error.message : `No se pudo procesar el archivo: ${String(error.message ?? error).split('\n')[0]}`;
    if (!res.headersSent) send(res, status, { error: message });
  }
});

// Nunca tumbar ng serve con él (este módulo corre dentro del servidor de desarrollo, ver proxy.conf.mjs).
server.on('error', (error) => {
  const reason = error.code === 'EADDRINUSE' ? `el puerto ${PORT} está ocupado (¿otro ng serve abierto?)` : error.message;
  console.warn(`media-server: no se pudo iniciar, ${reason}. Las subidas y los medios locales no funcionarán en esta sesión.`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`media-server: http://127.0.0.1:${PORT} · ffmpeg ${FFMPEG ? 'OK' : 'NO ENCONTRADO (solo PDF)'}`);
});
