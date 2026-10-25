import { Component } from '@angular/core';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { CounterDirective } from '../../shared/directives/counter.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [SiteTextPipe, HeroSceneComponent, RevealDirective, MagneticDirective, CounterDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {
  /** Hero stats are stored as text in `site_content`; non-numeric input shows 0. */
  protected toCount(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
