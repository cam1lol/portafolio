import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, inject } from '@angular/core';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { CounterDirective } from '../../shared/directives/counter.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { AvailabilityComponent } from '../../shared/availability/availability.component';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { CvButtonComponent } from '../../shared/cv-button/cv-button.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [LineRevealDirective, SiteTextPipe, HeroSceneComponent, RevealDirective, MagneticDirective, CounterDirective, AvailabilityComponent, CvButtonComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Parallax de scroll: --hp va de 0 a 1 mientras el hero sale de pantalla; el CSS separa las líneas del
   * título, desvanece el texto y aleja el objeto 3D. Solo toca una variable CSS por fotograma y solo si
   * cambia (nada cuando el hero ya no se ve). La altura se mide al redimensionar y la posición en el
   * evento de scroll, así ningún fotograma fuerza un layout.
   */
  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let scheduled = false;
    let height = this.host.offsetHeight || window.innerHeight;
    let scrollY = window.scrollY;
    let last = '';
    const update = () => {
      scheduled = false;
      const value = Math.min(1, Math.max(0, scrollY / (height * 0.9))).toFixed(3);
      if (value === last) return;
      last = value;
      this.host.style.setProperty('--hp', value);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    const onResize = () => {
      height = this.host.offsetHeight || window.innerHeight;
      onScroll();
    };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      update();
    });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    });
  }

  /** Las cifras del hero se guardan como texto en `site_content`; lo que no sea numérico muestra 0. */
  protected toCount(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
