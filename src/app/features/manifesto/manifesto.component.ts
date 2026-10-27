import { Component } from '@angular/core';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';

@Component({
  selector: 'app-manifesto',
  standalone: true,
  imports: [LineRevealDirective, SectionHeadComponent, SiteTextPipe, InlineMarkupPipe],
  templateUrl: './manifesto.component.html',
  styleUrl: './manifesto.component.css',
})
export class ManifestoComponent {}
