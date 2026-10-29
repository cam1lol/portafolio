// Comprobación de fluidez (AGENTS.md, 8.1): abre Chrome (o Edge) CON ventana, para usar la GPU real, y
// cuenta los fotogramas que de verdad llegan a la pantalla (DrawFrame en el compositor de la página) en
// la portada (quieta y con scroll de rueda) y en una página de proyecto. Falla si algún escenario no es fluido.
//
//   npm run perf                       mide http://localhost:4200 (antes arranca "npm start")
//   npm run perf -- --url http://127.0.0.1:4401 --cpu 4
//
//   npm run perf -- --mobile --cpu 4    como un teléfono: 390x844, densidad 3x, táctil, scroll con el dedo
//
// Opciones: --url <base>, --cpu <n> (ralentiza la CPU, como un portátil modesto), --mobile, --browser <ruta>
// (o CHROME_PATH). Sin dependencias: Node 22 (fetch, WebSocket) y un navegador instalado.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const BASE = (args.url || process.env.PERF_URL || 'http://localhost:4200').replace(/\/$/, '');
const CPU = Number(args.cpu || 1);
const MOBILE = 'mobile' in args;
const PORT = 9333;
const MIN_FPS = 60;
const MAX_SLOW_SHARE = 0.05; // como mucho un 5% de fotogramas por encima de 25 ms

function findBrowser() {
  const candidates = [
    args.browser,
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  return candidates.find((path) => path && existsSync(path));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('No se pudo conectar con el navegador.');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    } else if (data.method) {
      for (const listener of listeners.get(data.method) || []) listener(data.params);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) || []), listener]);
  const ready = new Promise((resolve) => ws.addEventListener('open', resolve));
  return { ready, send, on, close: () => ws.close() };
}

async function main() {
  const browser = findBrowser();
  if (!browser) throw new Error('No encuentro Chrome ni Edge. Indica la ruta con --browser o CHROME_PATH.');
  const profile = mkdtempSync(join(tmpdir(), 'perf-check-'));
  const child = spawn(browser, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--window-size=1440,960', '--disable-extensions', 'about:blank',
  ], { stdio: 'ignore' });

  const results = [];
  let page;
  try {
    page = cdp(await connect());
    await page.ready;
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    const evaluate = async (expression) => (await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    const navigate = async (url) => {
      await page.send('Page.navigate', { url });
      await sleep(4000);
    };

    // Salta la intro de la primera visita y mide los efectos completos (no el modo ligero).
    await navigate(BASE + '/');
    await evaluate(`localStorage.setItem('ca-boot-seen-v1', '1'); localStorage.removeItem('ca-fx-lite-v2'); 1`);

    const trace = async (label, during) => {
      const events = [];
      page.on('Tracing.dataCollected', ({ value }) => events.push(...value));
      const done = new Promise((resolve) => page.on('Tracing.tracingComplete', resolve));
      await page.send('Tracing.start', { categories: 'cc,viz,devtools.timeline,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' });
      await during();
      await page.send('Tracing.end');
      await done;
      results.push({ label, ...summarize(events) });
    };
    const warmUp = () =>
      evaluate(`new Promise(async (res) => { document.documentElement.classList.remove('fx-lite'); const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); setTimeout(() => res(1), 1200); })`);
    const wheel = async (ms) => {
      if (MOBILE) {
        // Deslizar con el dedo, varias veces, como al leer en un teléfono.
        const end = Date.now() + ms;
        while (Date.now() < end) await page.send('Input.synthesizeScrollGesture', { x: 195, y: 600, yDistance: -500, speed: 1600, gestureSourceType: 'touch' });
        return;
      }
      const end = Date.now() + ms;
      while (Date.now() < end) {
        page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 50 });
        await sleep(16);
      }
    };

    await page.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (MOBILE) {
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }

    await navigate(BASE + '/');
    await warmUp();
    await trace('Portada, parada', () => sleep(3000));
    await trace('Portada, scroll', () => wheel(3500));

    // El primer proyecto, si hay alguno.
    await navigate(BASE + '/proyectos');
    const project = await evaluate(`(document.querySelector('a[href^="/proyectos/"]') || {}).getAttribute?.('href') || ''`);
    if (project) {
      await navigate(BASE + project);
      await warmUp();
      await trace('Proyecto, parada', () => sleep(3000));
      await trace('Proyecto, scroll', () => wheel(3500));
    }
  } finally {
    page?.close();
    child.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  let failed = false;
  console.log(`\nFluidez en ${BASE} (CPU x${CPU}), fotogramas que llegan a pantalla:\n`);
  for (const r of results) {
    const target = Math.min(MIN_FPS, r.refresh) * 0.9;
    const ok = r.fps >= target && r.slowShare <= MAX_SLOW_SHARE;
    if (!ok) failed = true;
    console.log(`  ${ok ? 'OK   ' : 'LENTO'}  ${r.label.padEnd(18)} ${String(r.fps).padStart(4)} fps   lentos >25 ms: ${r.slow} (${(r.slowShare * 100).toFixed(1)}%)   pantalla ~${r.refresh} Hz`);
  }
  console.log(failed ? '\nAlgo baja del umbral: revisa AGENTS.md, 8.1.\n' : '\nTodo fluido.\n');
  process.exit(failed ? 1 : 0);
}

/** Fotogramas dibujados por el compositor de la página (el hilo Compositor más ocupado del renderer). */
function summarize(events) {
  const threads = new Map(events.filter((e) => e.ph === 'M' && e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args.name]));
  const byThread = new Map();
  const begins = new Map();
  for (const e of events) {
    const key = `${e.pid}:${e.tid}`;
    if (threads.get(key) !== 'Compositor') continue;
    if (e.name === 'DrawFrame') (byThread.get(key) || byThread.set(key, []).get(key)).push(e.ts);
    if (e.name === 'BeginFrame') (begins.get(key) || begins.set(key, []).get(key)).push(e.ts);
  }
  const [key, draws = []] = [...byThread.entries()].sort((a, b) => b[1].length - a[1].length)[0] || [];
  draws.sort((a, b) => a - b);
  const span = draws.length > 1 ? (draws.at(-1) - draws[0]) / 1e6 : 1;
  const gaps = draws.slice(1).map((t, i) => (t - draws[i]) / 1000);
  const beginGaps = (begins.get(key) || []).sort((a, b) => a - b).map((t, i, all) => (i ? (t - all[i - 1]) / 1000 : 0)).filter(Boolean).sort((a, b) => a - b);
  const vsync = beginGaps[Math.floor(beginGaps.length / 2)] || 16.7;
  const slow = gaps.filter((g) => g > 25).length;
  return { fps: Math.round(draws.length / span), slow, slowShare: gaps.length ? slow / gaps.length : 1, refresh: Math.round(1000 / vsync) };
}

main().catch((error) => {
  console.error('\n' + error.message + '\n');
  process.exit(2);
});
