import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';

@Component({
  selector: 'app-manifesto',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent, SiteTextPipe, InlineMarkupPipe],
  templateUrl: './manifesto.component.html',
  styleUrl: './manifesto.component.css',
})
export class ManifestoComponent {}
