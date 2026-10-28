import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RevealObserverService } from './reveal-observer.service';

const DURATION = 1300;

/**
 * Scan reveal (A9): the first time the image scrolls into view a cover lifts while an accent line
 * sweeps down over it. Styles in styles.css (.scan-reveal). Transform and opacity only; skipped
 * with reduced motion and in fx-lite, where the image simply shows.
 */
@Directive({
  selector: '[appScanReveal]',
  standalone: true,
  host: { class: 'scan-reveal' },
})
export class ScanRevealDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly revealObserver = inject(RevealObserverService);
  private observing = false;
  private timer = 0;

  ngOnInit(): void {
    const lite = document.documentElement.classList.contains('fx-lite');
    if (lite || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.host.classList.add('scan-done');
      return;
    }
    this.observing = true;
    this.revealObserver.observe(this.host, () => {
      if (this.host.classList.contains('scan-go')) return;
      this.host.classList.add('scan-go');
      this.timer = window.setTimeout(() => this.host.classList.add('scan-done'), DURATION);
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.timer);
    if (this.observing) this.revealObserver.unobserve(this.host);
  }
}
