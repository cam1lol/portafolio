import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, SectionHeadComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
})
export class ServicesComponent {}
