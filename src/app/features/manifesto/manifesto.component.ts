import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { translateSignal } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';

@Component({
  selector: 'app-manifesto',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent],
  templateUrl: './manifesto.component.html',
  styleUrl: './manifesto.component.css',
})
export class ManifestoComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly bodyText = translateSignal('ab_body');

  protected readonly body = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.bodyText()),
  );
}
