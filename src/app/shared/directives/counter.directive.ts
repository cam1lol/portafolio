import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';

const DURATION_MS = 1100;
const FRAME_MS = 45;

/**
 * Hero figures as a HUD readout: random digits that lock in from left to right until the target
 * shows ("37" -> "91" -> "14" -> "11"). Re-runs when the target changes (the value can arrive
 * later from Supabase). Reduced motion shows the number straight away.
 */
@Directive({
  selector: '[appCounter]',
  standalone: true,
})
export class CounterDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appCounter!: number;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnChanges(): void {
    this.stop();
    const host = this.elementRef.nativeElement;
    const target = String(this.appCounter);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      host.textContent = target;
      return;
    }

    const start = performance.now();
    this.intervalId = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / DURATION_MS);
      // Digits lock one by one; the rest keep changing.
      const locked = Math.floor(progress * (target.length + 1));
      let out = '';
      for (let i = 0; i < target.length; i++) {
        out += i < locked ? target[i] : String(Math.floor(Math.random() * 10));
      }
      host.textContent = progress >= 1 ? target : out;
      if (progress >= 1) this.stop();
    }, FRAME_MS);
  }

  private stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
