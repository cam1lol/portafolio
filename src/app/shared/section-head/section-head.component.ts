import { Component, Input } from '@angular/core';
import { SiteTextPipe } from '../site-text/site-text.pipe';
import { RevealDirective } from '../directives/reveal.directive';

@Component({
  selector: 'app-section-head',
  standalone: true,
  imports: [SiteTextPipe, RevealDirective],
  template: `
    <div class="sec-head">
      <span class="idx mono reveal" appReveal>{{ index }}</span>
      <h2 class="reveal" appReveal>{{ headingKey | siteText }}</h2>
      <span class="desc reveal" appReveal>{{ descKey | siteText }}</span>
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
