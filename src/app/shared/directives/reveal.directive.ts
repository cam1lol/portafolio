import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RevealObserverService } from './reveal-observer.service';

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
