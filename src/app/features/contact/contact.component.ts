import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, MagneticDirective],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly headingText = translateSignal('ct_h');

  protected readonly heading = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.headingText()),
  );
}
