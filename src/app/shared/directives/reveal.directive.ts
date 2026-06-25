import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RevealObserverService } from './reveal-observer.service';

/**
 * Ported from the prototype's `.reveal` / `.reveal.in` scroll-reveal system
 * and `observeReveals()` (camilo-ayala-prototype.html lines 37-39, 814-820).
 *
 * Add the `in` class once the host enters the viewport (threshold .15) and
 * never re-trigger. Respects `prefers-reduced-motion: reduce` by applying
 * the final visible state immediately, without ever touching the observer.
 *
 * Usage: `<span appReveal>...</span>` paired with the `.reveal`/`.clip` CSS
 * (opacity/transform transition) defined in global styles.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly revealObserver = inject(RevealObserverService);

  private observing = false;

  ngOnInit(): void {
    const host = this.elementRef.nativeElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      host.classList.add('in');
      return;
    }

    this.observing = true;
    this.revealObserver.observe(host, () => host.classList.add('in'));
  }

  ngOnDestroy(): void {
    if (this.observing) {
      this.revealObserver.unobserve(this.elementRef.nativeElement);
    }
  }
}
