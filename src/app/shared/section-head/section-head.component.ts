import { Component, Input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-section-head',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective],
  template: `
    <div class="sec-head">
      <span class="idx mono reveal" appReveal>{{ index }}</span>
      <h2 class="reveal" appReveal>{{ headingKey | transloco }}</h2>
      <span class="desc reveal" appReveal>{{ descKey | transloco }}</span>
    </div>
  `,
  styleUrl: './section-head.component.css',
})
export class SectionHeadComponent {
  @Input({ required: true })
  index!: string;

  @Input({ required: true })
  headingKey!: string;

  @Input({ required: true })
  descKey!: string;
}
