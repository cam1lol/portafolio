import { Directive, ElementRef, OnDestroy, booleanAttribute, effect, inject, input, signal, untracked } from '@angular/core';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>[]_#*+=';
const DURATION = 650;

/**
 * "Descifrado" HUD de un titular: glifos al azar que se resuelven en el texto de izquierda a derecha.
 * Espera a que termine una transición de proyecto en curso (el título llega primero transformándose).
 * Los lectores de pantalla siempre reciben el texto real; los glifos van con aria-hidden. Se salta con
 * movimiento reducido. Con `scrambleOnView` (titulares de sección) además espera a que entre en pantalla.
 */
@Directive({ selector: '[appScramble]', standalone: true })
export class ScrambleDirective implements OnDestroy {
  readonly text = input.required<string>({ alias: 'appScramble' });
  readonly onView = input(false, { alias: 'scrambleOnView', transform: booleanAttribute });

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly vt = inject(ProjectTransitionService);
  private frame = 0;
  private played = '';
  private readonly inView = signal(false);
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.inView.set(true);
        this.observer?.disconnect();
      },
      { threshold: 0.6 },
    );
    this.observer.observe(this.el);

    effect(() => {
      const text = this.text();
      const busy = this.vt.transitioning();
      const waiting = this.onView() && !this.inView();
      untracked(() => {
        if (busy || waiting) {
          this.render(text); // texto plano mientras corre la transformación (es lo que muestra la captura)
          return;
        }
        if (text === this.played) return;
        this.played = text;
        this.play(text);
      });
    });
  }

  private play(text: string): void {
    cancelAnimationFrame(this.frame);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.render(text);
      return;
    }
    // Fija la altura del texto final para que el ancho cambiante de los glifos no mueva la página.
    this.render(text);
    this.el.style.minHeight = `${this.el.offsetHeight}px`;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      const resolved = Math.floor(progress * text.length);
      let out = text.slice(0, resolved);
      for (let i = resolved; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      this.render(text, out);
      if (progress < 1) this.frame = requestAnimationFrame(tick);
      else this.el.style.minHeight = '';
    };
    tick(start); // primer fotograma al momento, para que el titular nunca quede vacío
  }

  /** Texto real para tecnologías de apoyo; `shown` (los glifos) solo para la vista. */
  private render(text: string, shown = text): void {
    if (shown === text) {
      this.el.textContent = text;
      this.el.removeAttribute('aria-label');
      return;
    }
    this.el.setAttribute('aria-label', text);
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = shown;
    this.el.replaceChildren(span);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }
}
