import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  private onPointerMove?: (event: PointerEvent) => void;
  private onPointerLeave?: () => void;

  ngOnInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const host = this.elementRef.nativeElement;

    this.onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      host.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
    };
    this.onPointerLeave = () => {
      host.style.transform = '';
    };

    // Only moves the element: no change detection per pointer event.
    this.zone.runOutsideAngular(() => {
      host.addEventListener('pointermove', this.onPointerMove!, { passive: true });
      host.addEventListener('pointerleave', this.onPointerLeave!);
    });
  }

  ngOnDestroy(): void {
    const host = this.elementRef.nativeElement;
    if (this.onPointerMove) {
      host.removeEventListener('pointermove', this.onPointerMove);
    }
    if (this.onPointerLeave) {
      host.removeEventListener('pointerleave', this.onPointerLeave);
    }
  }
}
