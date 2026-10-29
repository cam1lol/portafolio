import { Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject } from '@angular/core';
import { ScrollFrameService } from '../perf/scroll-frame.service';

/** Separación entre el elemento enfocado y las esquinas, en px. */
const PAD = 6;

/**
 * Esquinas HUD alrededor de lo que tiene el foco de teclado (solo :focus-visible, nunca con clics de
 * ratón). Una sola capa fija para toda la app en vez de pseudo-elementos en cada control: se mueve con
 * transform, cambia de tamaño solo al cambiar el foco y sigue al elemento en el scroll con el
 * ScrollFrameService compartido mientras hay algo enfocado. Los elementos dentro de un <dialog> abierto
 * (capa superior, se pinta encima de esta) conservan solo su propio contorno.
 */
@Component({
  selector: 'app-focus-hud',
  standalone: true,
  template: `<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>`,
  styles: `
    :host {
      position: fixed; top: 0; left: 0; z-index: 70; pointer-events: none;
      opacity: 0; transition: opacity .15s;
    }
    :host(.on) { opacity: 1; }
    /* Solo al pasar de un elemento al siguiente (Tab); en el scroll sigue sin retraso. */
    :host(.glide) { transition: opacity .15s, transform .18s cubic-bezier(.2, .7, .2, 1); }
    .c { position: absolute; width: 8px; height: 8px; border: 0 solid var(--ember); }
    .tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
    .tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; }
    .bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
    .br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; }
    @media (prefers-reduced-motion: reduce) { :host, :host(.glide) { transition: none; } }
    @media print { :host { display: none; } }
  `,
})
export class FocusHudComponent {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly frames = inject(ScrollFrameService);
  private readonly destroyRef = inject(DestroyRef);

  private target: HTMLElement | null = null;
  private stopFollowing: (() => void) | null = null;
  private last = { x: NaN, y: NaN, w: NaN, h: NaN };
  /** focusout llega antes que el siguiente focusin: ocultar espera un instante para que Tab deslice en vez de parpadear. */
  private hideTimer = 0;
  private glideTimer = 0;

  constructor() {
    const zone = inject(NgZone);
    afterNextRender(() => {
      const onFocusIn = (event: FocusEvent) => {
        const el = event.target as HTMLElement | null;
        if (!el?.matches?.(':focus-visible') || el.closest('dialog[open]')) {
          clearTimeout(this.hideTimer);
          return this.hide();
        }
        this.show(el);
      };
      const onFocusOut = () => {
        clearTimeout(this.hideTimer);
        this.hideTimer = window.setTimeout(() => this.hide(), 0);
      };
      zone.runOutsideAngular(() => {
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
      });
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);
        this.stopFollowing?.();
        clearTimeout(this.hideTimer);
        clearTimeout(this.glideTimer);
      });
    });
  }

  private show(el: HTMLElement): void {
    clearTimeout(this.hideTimer);
    const moving = !!this.target && this.target !== el;
    this.target = el;
    if (moving) {
      this.host.classList.add('glide');
      clearTimeout(this.glideTimer);
      this.glideTimer = window.setTimeout(() => this.host.classList.remove('glide'), 200);
    }
    this.stopFollowing ??= this.frames.register<DOMRect | null>({
      read: () => this.target?.getBoundingClientRect() ?? null,
      write: (rect) => this.place(rect),
    });
    this.frames.request();
  }

  private hide(): void {
    this.target = null;
    this.last = { x: NaN, y: NaN, w: NaN, h: NaN };
    this.host.classList.remove('on');
    this.stopFollowing?.();
    this.stopFollowing = null;
  }

  private place(rect: DOMRect | null): void {
    if (!rect || !rect.width) return this.host.classList.remove('on');
    const x = Math.round(rect.left - PAD);
    const y = Math.round(rect.top - PAD);
    const w = Math.round(rect.width + PAD * 2);
    const h = Math.round(rect.height + PAD * 2);
    if (w !== this.last.w || h !== this.last.h) {
      this.host.style.width = `${w}px`;
      this.host.style.height = `${h}px`;
    }
    if (x !== this.last.x || y !== this.last.y) this.host.style.transform = `translate(${x}px, ${y}px)`;
    this.last = { x, y, w, h };
    if (!this.host.classList.contains('on')) this.host.classList.add('on');
  }
}
