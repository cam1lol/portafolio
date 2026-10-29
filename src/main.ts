import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { applyScene, readCachedScene } from './app/core/scene/scene.config';

// Equipos modestos: efectos más ligeros ("fx-lite" en styles.css). Se decide al arrancar según núcleos y
// memoria, o según una visita anterior que midió pocos fps en este dispositivo. Casi todos los móviles
// declaran 4 GB o menos (el navegador redondea a la baja), así que la memoria sola no basta para decidir.
const FX_LITE_KEY = 'ca-fx-lite-v2'; // v2: las visitas que guardaron v1 con el criterio anterior vuelven a medirse
const FX_LITE_DAYS = 7;
const nav = navigator as Navigator & { deviceMemory?: number };
const root = document.documentElement;
let remembered = false;
try {
  const until = Number(localStorage.getItem(FX_LITE_KEY));
  remembered = until > Date.now();
} catch {}
const cores = nav.hardwareConcurrency ?? 8;
const memory = nav.deviceMemory ?? 8;
if (remembered || cores <= 2 || memory <= 2 || (cores <= 4 && memory <= 4)) root.classList.add('fx-lite');
// Ajustes del admin (Escena) vistos en la última visita: se aplican antes del primer fotograma.
applyScene(readCachedScene(), root);

// Muchos núcleos pero una GPU débil (habitual en portátiles) solo se ve midiendo: unos segundos tras la
// carga (para no contar el arranque), si el fotograma mediano tarda más de ~22 ms (menos de ~45 fps) se
// activa el modo ligero y se recuerda una semana en este dispositivo.
function measureFrameRate(): void {
  if (root.classList.contains('fx-lite') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setTimeout(() => {
    if (document.hidden) return;
    const frames: number[] = [];
    let last = performance.now();
    const step = (now: number) => {
      frames.push(now - last);
      last = now;
      if (frames.length < 90 && !document.hidden) {
        requestAnimationFrame(step);
        return;
      }
      if (frames.length < 30) return;
      const median = [...frames].sort((x, y) => x - y)[Math.floor(frames.length / 2)];
      if (median > 22) {
        root.classList.add('fx-lite');
        try {
          localStorage.setItem(FX_LITE_KEY, String(Date.now() + FX_LITE_DAYS * 864e5));
        } catch {}
      }
    };
    requestAnimationFrame(step);
  }, 4000);
}
if (document.readyState === 'complete') measureFrameRate();
else addEventListener('load', measureFrameRate, { once: true });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
