import { Component, OnDestroy, OnInit, output } from '@angular/core';

const SEEN_KEY = 'ca-boot-seen-v1';
const DURATION = 950;

/**
 * Intro de la primera visita (< 1 s): la marca CA se dibuja en líneas HUD con las coordenadas de
 * Bogotá y la pantalla se abre hacia arriba sobre el hero, que ya se estaba pintando detrás. Se ve
 * una vez por navegador, solo al entrar por la portada; cualquier clic o tecla la salta.
 */
@Component({
  selector: 'app-boot',
  standalone: true,
  template: `
    <div class="boot" (click)="finish()" aria-hidden="true">
      <div class="mark">
        <svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" /></svg>
        <span class="ca">CA</span>
      </div>
      <span class="coords">4.71°N · 74.07°W // INIT</span>
      <span class="bar"><span></span></span>
    </div>
  `,
  styles: `
    .boot {
      position: fixed; inset: 0; z-index: 200; display: grid; place-content: center; justify-items: center; gap: 18px;
      background: var(--ink); cursor: pointer;
      animation: boot-open .3s cubic-bezier(.7, 0, .3, 1) .65s both;
    }
    .mark { position: relative; width: 64px; height: 64px; display: grid; place-items: center; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: var(--bone); stroke-width: 2; }
    rect { stroke-dasharray: 240; stroke-dashoffset: 240; animation: boot-draw .45s cubic-bezier(.6, 0, .2, 1) both; }
    .ca { color: var(--bone); font: 900 22px/1 'Archivo', sans-serif; letter-spacing: -.04em; opacity: 0; animation: boot-in .2s ease .35s both; }
    .coords { color: var(--steel); font: 10px/1 'Space Mono', monospace; letter-spacing: .16em; opacity: 0; animation: boot-in .2s ease .25s both; }
    .bar { width: 120px; height: 1px; background: var(--line); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ember); transform-origin: left; animation: boot-bar .6s cubic-bezier(.6, 0, .2, 1) both; }
    @keyframes boot-draw { to { stroke-dashoffset: 0; } }
    @keyframes boot-in { to { opacity: 1; } }
    @keyframes boot-bar { from { transform: scaleX(0); } }
    @keyframes boot-open { to { clip-path: inset(0 0 100% 0); } }
  `,
})
export class BootComponent implements OnInit, OnDestroy {
  readonly done = output<void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onKey = () => this.finish();

  /** Solo en una primera visita que entra por la portada, y nunca con movimiento reducido. */
  static shouldShow(path: string): boolean {
    if (path !== '/' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      if (localStorage.getItem(SEEN_KEY)) return false;
      localStorage.setItem(SEEN_KEY, '1');
      return true;
    } catch {
      return false; // almacenamiento bloqueado (modo privado): mejor saltarla que mostrarla en cada visita
    }
  }

  ngOnInit(): void {
    this.timer = setTimeout(() => this.finish(), DURATION);
    window.addEventListener('keydown', this.onKey, { once: true });
  }

  finish(): void {
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey);
    this.done.emit();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKey);
  }
}
