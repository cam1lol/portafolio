import { Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';

/** El toque tiene que empezar así de cerca del borde izquierdo (px), como el gesto nativo de volver. */
const EDGE = 24;
/** Movimiento necesario antes de decidir entre deslizar en horizontal o hacer scroll vertical. */
const DECIDE = 10;
/** Soltar pasada esta fracción del ancho, o más rápido que esta velocidad (px/ms), vuelve atrás. */
const DISTANCE_RATIO = 1 / 3;
const SPEED = 0.5;

/**
 * Pantallas táctiles: deslizar desde el borde izquierdo arrastra la página con el dedo; soltar lejos o
 * rápido vuelve atrás (a la pantalla anterior de la app, o a `fallback` si la página se abrió
 * directamente). Nunca bloquea el scroll vertical: el gesto solo se activa con un movimiento horizontal.
 */
@Directive({ selector: '[appSwipeBack]', standalone: true })
export class SwipeBackDirective implements OnDestroy {
  /** Adónde ir si no hay pantalla anterior en la app (página abierta desde un enlace compartido). */
  readonly fallback = input('/', { alias: 'appSwipeBack' });
  /** Se ve en el borde izquierdo mientras se arrastra, p. ej. "Todos los proyectos". */
  readonly label = input('', { alias: 'swipeBackLabel' });

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly vt = inject(ProjectTransitionService);
  private readonly zone = inject(NgZone);

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private dx = 0;
  /** null: el toque empezó lejos del borde; 'pending': sin decidir; luego swipe o scroll. */
  private mode: null | 'pending' | 'swipe' | 'scroll' = null;
  /** Capa oscura detrás de la página con la etiqueta de volver; se aclara al mover el dedo (como en iOS). */
  private backdrop: HTMLElement | null = null;

  private readonly onStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || touch.clientX > EDGE) return;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = event.timeStamp;
    this.dx = 0;
    this.mode = 'pending';
  };

  private readonly onMove = (event: TouchEvent) => {
    if (!this.mode || this.mode === 'scroll') return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    if (this.mode === 'pending') {
      if (Math.abs(dy) > DECIDE && Math.abs(dy) > Math.abs(dx)) {
        this.mode = 'scroll';
        return;
      }
      if (dx < DECIDE) return;
      this.mode = 'swipe';
      this.el.style.transition = 'none';
      this.el.style.willChange = 'transform';
      this.el.style.boxShadow = '-16px 0 40px rgba(0, 0, 0, .45)';
      this.showBackdrop();
    }
    event.preventDefault(); // la página sigue al dedo en vez de hacer scroll
    this.dx = Math.max(0, dx);
    this.el.style.transform = `translateX(${this.dx}px)`;
    this.updateBackdrop(this.dx / (this.el.getBoundingClientRect().width || window.innerWidth));
  };

  private readonly onEnd = (event: TouchEvent) => {
    if (this.mode !== 'swipe') {
      this.mode = null;
      return;
    }
    this.mode = null;
    const width = this.el.getBoundingClientRect().width || window.innerWidth;
    const speed = this.dx / Math.max(1, event.timeStamp - this.startTime);
    const goBack = this.dx > width * DISTANCE_RATIO || speed > SPEED;
    this.el.style.transition = 'transform .22s cubic-bezier(.2, .7, .2, 1)';
    this.el.style.transform = goBack ? 'translateX(100%)' : 'translateX(0)';
    if (this.backdrop) {
      this.backdrop.style.transition = 'opacity .22s ease';
      this.updateBackdrop(goBack ? 1 : 0);
    }
    if (goBack) {
      setTimeout(() => this.zone.run(() => this.navigateBack()), 200);
    } else {
      setTimeout(() => this.reset(), 230);
    }
  };

  constructor() {
    // Listeners fuera de Angular (sin detección de cambios en cada touchmove); touchmove no es pasivo para
    // que el gesto pueda frenar el scroll cuando ya es claramente horizontal.
    this.zone.runOutsideAngular(() => {
      this.el.addEventListener('touchstart', this.onStart, { passive: true });
      this.el.addEventListener('touchmove', this.onMove, { passive: false });
      this.el.addEventListener('touchend', this.onEnd, { passive: true });
      this.el.addEventListener('touchcancel', this.onEnd, { passive: true });
    });
  }

  private navigateBack(): void {
    // La página ya se fue con el dedo: sin segunda animación.
    this.vt.skipNextTransition();
    const cameFromApp = !!this.router.lastSuccessfulNavigation?.previousNavigation;
    if (cameFromApp) this.location.back();
    else this.router.navigateByUrl(this.fallback());
  }

  private showBackdrop(): void {
    // La página necesita fondo sólido al deslizar, así la capa solo se ve en el lado descubierto.
    this.el.style.position = 'relative';
    this.el.style.zIndex = '2';
    this.el.style.background = 'var(--ink)';
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText =
      'position:fixed;inset:0;z-index:1;display:flex;align-items:center;padding-left:18px;pointer-events:none;' +
      'background:rgba(5,6,8,.72);font:11px/1 "Space Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ember)';
    const text = document.createElement('span');
    text.textContent = '← ' + this.label();
    text.style.cssText = 'opacity:0;transform:translateX(-16px)';
    layer.appendChild(text);
    document.body.appendChild(layer);
    this.backdrop = layer;
  }

  /** progreso 0 (página en su sitio) a 1 (página fuera): la capa se aclara y la etiqueta entra. */
  private updateBackdrop(progress: number): void {
    if (!this.backdrop) return;
    const p = Math.min(1, Math.max(0, progress));
    this.backdrop.style.background = `rgba(5, 6, 8, ${(0.72 * (1 - p)).toFixed(3)})`;
    const text = this.backdrop.firstElementChild as HTMLElement;
    text.style.opacity = Math.min(1, p * 2.5).toFixed(2);
    text.style.transform = `translateX(${(-16 + 16 * Math.min(1, p * 2.5)).toFixed(1)}px)`;
  }

  private reset(): void {
    this.backdrop?.remove();
    this.backdrop = null;
    this.el.style.position = '';
    this.el.style.zIndex = '';
    this.el.style.background = '';
    this.el.style.transition = '';
    this.el.style.transform = '';
    this.el.style.willChange = '';
    this.el.style.boxShadow = '';
  }

  ngOnDestroy(): void {
    this.backdrop?.remove();
    this.el.removeEventListener('touchstart', this.onStart);
    this.el.removeEventListener('touchmove', this.onMove);
    this.el.removeEventListener('touchend', this.onEnd);
    this.el.removeEventListener('touchcancel', this.onEnd);
  }
}
