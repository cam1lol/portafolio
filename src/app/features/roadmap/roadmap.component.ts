import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, SectionHeadComponent],
  templateUrl: './roadmap.component.html',
  styleUrl: './roadmap.component.css',
})
export class RoadmapComponent {}
