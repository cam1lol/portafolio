import { Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';
import { ContactModalComponent } from './contact-modal.component';
import { AvailabilityComponent } from '../../shared/availability/availability.component';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, MagneticDirective, SiteTextPipe, InlineMarkupPipe, ContactModalComponent, AvailabilityComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  protected readonly open = signal(false);

  /** Only real-looking addresses become a `mailto:` link. */
  protected mailto(email: string): string | null {
    const trimmed = email.trim();
    return EMAIL_PATTERN.test(trimmed) ? `mailto:${trimmed}` : null;
  }
}
