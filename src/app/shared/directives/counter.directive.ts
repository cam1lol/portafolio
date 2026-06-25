import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Ported from the prototype's `.count` / `runCounters()` (camilo-ayala-
 * prototype.html lines 821-826). Animates the host's textContent from 0 up
 * to the target value using the same step/interval formula:
 * `step = max(1, round(to / 30))`, ticking every 34ms.
 *
 * Respects `prefers-reduced-motion: reduce` by writing the final value
 * immediately instead of animating.
 *
 * Usage: `<span [appCounter]="42"></span>` (equivalent to the prototype's
 * `data-to="42"` on an element with the `.count` class).
 */
@Directive({
  selector: '[appCounter]',
  standalone: true,
})
export class CounterDirective implements OnInit, OnDestroy {
  @Input({ required: true }) appCounter!: number;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const host = this.elementRef.nativeElement;
    const to = this.appCounter;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      host.textContent = `${to}`;
      return;
    }

    let current = 0;
    const step = Math.max(1, Math.round(to / 30));

    this.intervalId = setInterval(() => {
      current += step;
      if (current >= to) {
        current = to;
        if (this.intervalId !== undefined) {
          clearInterval(this.intervalId);
        }
      }
      host.textContent = `${current}`;
    }, 34);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }
}
