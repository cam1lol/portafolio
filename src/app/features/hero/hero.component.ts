import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { CounterDirective } from '../../shared/directives/counter.directive';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [TranslocoPipe, HeroSceneComponent, RevealDirective, MagneticDirective, CounterDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {}
