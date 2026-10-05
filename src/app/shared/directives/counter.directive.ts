import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

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
