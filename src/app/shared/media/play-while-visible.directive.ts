import { AfterViewInit, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';
import { prefersLightEffects, whenVisible } from '../perf/perf-utils';

/**
 * Reproduce en bucle un clip sin sonido solo mientras se ve (la mitad visible) y lo pausa si no, así
 * una cuadrícula de clips nunca decodifica más de lo que se ve. Con movimiento reducido no se reproduce
 * solo. En modo ligero con ratón se reproduce al pasar el ratón o enfocar su tarjeta; en táctil (sin
 * hover posible) se reproduce mientras se ve, como siempre.
 */
@Directive({
  selector: 'video[appPlayWhileVisible]',
  standalone: true,
})
export class PlayWhileVisibleDirective implements AfterViewInit {
  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.video.muted = true;
    this.zone.runOutsideAngular(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (prefersLightEffects() && window.matchMedia('(hover: hover)').matches) {
        const card = this.video.closest<HTMLElement>('.card') ?? this.video;
        const enter = () => this.play();
        const leave = () => this.video.pause();
        card.addEventListener('mouseenter', enter);
        card.addEventListener('mouseleave', leave);
        card.addEventListener('focusin', enter);
        card.addEventListener('focusout', leave);
        this.destroyRef.onDestroy(() => {
          card.removeEventListener('mouseenter', enter);
          card.removeEventListener('mouseleave', leave);
          card.removeEventListener('focusin', enter);
          card.removeEventListener('focusout', leave);
        });
        return;
      }
      const stop = whenVisible(this.video, (visible) => (visible ? this.play() : this.video.pause()), '-25% 0px');
      this.destroyRef.onDestroy(stop);
    });
  }

  private play(): void {
    // Falla si el navegador lo bloquea o falta el archivo: el póster sigue visible.
    this.video.play()?.catch(() => undefined);
  }
}
