import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RevealDirective, MagneticDirective, SiteTextPipe, InlineMarkupPipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  /** Only real-looking addresses become a `mailto:` link. */
  protected mailto(email: string): string | null {
    const trimmed = email.trim();
    return EMAIL_PATTERN.test(trimmed) ? `mailto:${trimmed}` : null;
  }
}
