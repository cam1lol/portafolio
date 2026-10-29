import { Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

const MAX_DEG = 6;

/**
 * Ratón: la tarjeta se inclina hacia el cursor (hasta 6 grados) con un reflejo que lo sigue; al pulsar
 * se aplana al instante, así la transición de apertura parte de una tarjeta recta.
 * Táctil: la tarjeta entra girando en 3D con un barrido de reflejo la primera vez que aparece, y se
 * hunde con un destello al tocarla. Nada con movimiento reducido.
 */
@Directive({ selector: '[appTilt]', standalone: true })
export class TiltDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly zone = inject(NgZone);
  private glare: HTMLElement | null = null;
  private frame = 0;
  private readonly reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly enabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !this.reduce;
  private readonly touch = !this.enabled && !this.reduce;
  private observer: IntersectionObserver | null = null;

  private readonly onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const r = this.el.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width; // 0..1
      const py = (event.clientY - r.top) / r.height;
      const ry = (px - 0.5) * 2 * MAX_DEG;
      const rx = (0.5 - py) * 2 * MAX_DEG;
      this.el.style.transition = 'transform .12s ease-out';
      this.el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
      const glare = this.ensureGlare();
      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(420px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(242, 84, 27, .14), transparent 60%)`;
    });
  };

  private readonly onLeave = () => this.flatten('.45s');
  private readonly onDown = () => this.flatten('0s');

  constructor() {
    if (this.touch) {
      this.zone.runOutsideAngular(() => this.setUpTouch());
      return;
    }
    if (!this.enabled) return;
    this.zone.runOutsideAngular(() => {
      this.el.addEventListener('pointermove', this.onMove, { passive: true });
      this.el.addEventListener('pointerleave', this.onLeave, { passive: true });
      this.el.addEventListener('pointerdown', this.onDown, { passive: true });
    });
  }

  private setUpTouch(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.observer?.disconnect();
        this.el.animate(
          [
            { transform: 'perspective(700px) rotateX(16deg) translateY(28px) scale(.96)', opacity: 0.4 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 750, easing: 'cubic-bezier(.2, .9, .25, 1.15)' },
        );
        this.sweep(0.18, 900, 200);
      },
      { threshold: 0.25 },
    );
    this.observer.observe(this.el);
    this.el.addEventListener('pointerdown', this.onTap, { passive: true });
  }

  private readonly onTap = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    this.el.animate([{ transform: 'none' }, { transform: 'scale(.975)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    this.sweep(0.22, 450, 0);
  };

  /** Un reflejo diagonal sobre la tarjeta. */
  private sweep(strength: number, duration: number, delay: number): void {
    const glare = this.ensureGlare();
    glare.style.transition = 'none';
    glare.style.opacity = '1';
    glare.style.background = `linear-gradient(115deg, transparent 35%, rgba(242, 84, 27, ${strength}) 50%, transparent 65%) 0 0 / 250% 100% no-repeat`;
    glare
      .animate([{ backgroundPosition: '120% 0' }, { backgroundPosition: '-60% 0' }], { duration, delay, easing: 'ease-in-out', fill: 'both' })
      .finished.then(() => (glare.style.opacity = '0'))
      .catch(() => undefined);
  }

  private ensureGlare(): HTMLElement {
    if (this.glare) return this.glare;
    if (getComputedStyle(this.el).position === 'static') this.el.style.position = 'relative';
    const glare = document.createElement('span');
    glare.setAttribute('aria-hidden', 'true');
    glare.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;z-index:1';
    this.el.appendChild(glare);
    this.glare = glare;
    return glare;
  }

  private flatten(duration: string): void {
    cancelAnimationFrame(this.frame);
    this.el.style.transition = `transform ${duration} cubic-bezier(.2, .7, .2, 1)`;
    this.el.style.transform = '';
    if (this.glare) this.glare.style.opacity = '0';
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.el.removeEventListener('pointerdown', this.onTap);
    cancelAnimationFrame(this.frame);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    this.el.removeEventListener('pointerdown', this.onDown);
    this.glare?.remove();
  }
}
