import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { applyScene, readCachedScene } from './app/core/scene/scene.config';

// Modest hardware: lighter effects (styles.css "fx-lite"). Decided at start from cores and memory,
// or from a previous visit that measured a slow frame rate on this device.
const FX_LITE_KEY = 'ca-fx-lite-v1';
const FX_LITE_DAYS = 7;
const nav = navigator as Navigator & { deviceMemory?: number };
const root = document.documentElement;
let remembered = false;
try {
  const until = Number(localStorage.getItem(FX_LITE_KEY));
  remembered = until > Date.now();
} catch {}
if (remembered || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4) root.classList.add('fx-lite');
// Settings from the admin (Escena) seen on the last visit: applied before the first frame.
applyScene(readCachedScene(), root);

// Many cores but a weak GPU (common on laptops) is only visible by measuring: a few seconds after
// load (so startup work does not count), if the median frame takes longer than ~22 ms (under ~45
// fps) the light mode is switched on and remembered for a week on this device.
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
