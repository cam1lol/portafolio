import { Component, HostListener, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { InlineMarkupPipe } from '../../shared/site-text/inline-markup.pipe';
import { ContactModalComponent } from './contact-modal.component';
import { LineRevealDirective } from '../../shared/directives/line-reveal.directive';
import { AvailabilityComponent } from '../../shared/availability/availability.component';
import { ContactClockComponent } from './contact-clock.component';
import { OPEN_CONTACT_EVENT, OpenContactDetail } from '../../core/data/contact.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [LineRevealDirective, TranslocoPipe, RevealDirective, MagneticDirective, SiteTextPipe, InlineMarkupPipe, ContactModalComponent, AvailabilityComponent, ContactClockComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  protected readonly open = signal(false);
  /** Lo fija "Cotizar esto" (OPEN_CONTACT_EVENT); se limpia al cerrar el formulario. */
  protected readonly service = signal('');
  protected readonly returnTo = signal<HTMLElement | null>(null);

  @HostListener('window:' + OPEN_CONTACT_EVENT, ['$event'])
  protected onOpenRequest(event: CustomEvent<OpenContactDetail | undefined>): void {
    this.service.set(event.detail?.service ?? '');
    this.returnTo.set(event.detail?.returnFocusTo ?? null);
    this.open.set(true);
  }

  protected onClosed(): void {
    this.open.set(false);
    this.service.set('');
    this.returnTo.set(null);
  }

  /** Solo las direcciones con forma real se convierten en enlace `mailto:`. */
  protected mailto(email: string): string | null {
    const trimmed = email.trim();
    return EMAIL_PATTERN.test(trimmed) ? `mailto:${trimmed}` : null;
  }
}
