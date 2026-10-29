import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RevealObserverService } from './reveal-observer.service';

const DURATION = 1300;

/**
 * Revelado tipo escáner (A9): la primera vez que la imagen entra en pantalla, una tapa se levanta
 * mientras una línea de acento la barre hacia abajo. Estilos en styles.css (.scan-reveal). Solo
 * transform y opacity (barato, así que también corre en fx-lite); se salta con movimiento reducido, donde la
 * imagen aparece sin más.
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
