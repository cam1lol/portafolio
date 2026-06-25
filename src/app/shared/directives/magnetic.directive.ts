import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Ported from the prototype's `magnetics()` (camilo-ayala-prototype.html
 * lines 829-838). Displaces the host element toward the pointer while it
 * hovers, proportional to the pointer's offset from the element's center,
 * and resets on pointer leave.
 *
 * Skipped entirely (no listeners attached) when the user prefers reduced
 * motion or is on a coarse pointer (touch) device, matching the prototype's
 * early-return guards.
 *
 * Usage: `<button appMagnetic>...</button>`.
 */
@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

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

    host.addEventListener('pointermove', this.onPointerMove);
    host.addEventListener('pointerleave', this.onPointerLeave);
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
