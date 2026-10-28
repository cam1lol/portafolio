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
   * Scroll parallax: --hp goes 0 -> 1 while the hero scrolls away; the CSS splits the title lines
   * apart, fades the text and sends the 3D object back. Only touches one CSS variable per frame,
   * and only when it changes (nothing once the hero is out of view). The height is measured on
   * resize and the scroll position in the scroll event, so a frame never forces a layout.
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

  /** Hero stats are stored as text in `site_content`; non-numeric input shows 0. */
  protected toCount(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
