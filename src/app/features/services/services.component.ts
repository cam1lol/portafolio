import { Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { CollectionRow, CollectionsService } from '../../core/data/collections.service';
import { OPEN_CONTACT_EVENT, OpenContactDetail } from '../../core/data/contact.service';
import { SiteContentService } from '../../core/data/site-content.service';

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  price: string;
  /** Plazo típico, p. ej. "2 A 6 SEMANAS" (migración 0015; vacío = no se muestra). */
  timeline: string;
  /** Lista "Incluye", un punto por línea en el admin. */
  includes: string[];
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [NgTemplateOutlet, TranslocoPipe, RevealDirective, SectionHeadComponent, TiltDirective],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
})
export class ServicesComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly siteContent = inject(SiteContentService);

  /** `null` = sin cargar o tabla ausente: la plantilla usa las tarjetas de serie del i18n. */
  private readonly rows = toSignal(inject(CollectionsService).getPublished('services'), { initialValue: null });

  protected readonly cards = computed<ServiceCard[] | null>(() => {
    const rows = this.rows();
    if (!rows) return null;
    const lang = this.transloco.activeLang() === 'en' ? 'en' : 'es';
    // El inglés recurre al español en los campos nuevos, como en el resto del sitio.
    const text = (row: CollectionRow, name: string) => String(row[`${name}_${lang}`] || row[`${name}_es`] || '').trim();
    return rows.map((row: CollectionRow) => ({
      id: row.id,
      title: String(row[`title_${lang}`] ?? ''),
      description: String(row[`description_${lang}`] ?? ''),
      price: String(row[`price_${lang}`] ?? ''),
      timeline: text(row, 'timeline'),
      includes: text(row, 'includes').split('\n').map((line) => line.trim()).filter(Boolean),
    }));
  });

  protected index(position: number): string {
    return `S/${(position + 1).toString().padStart(2, '0')}`;
  }

  /**
   * "Cotizar esto": abre el formulario de contacto sobre este servicio. Si la sección de contacto está
   * oculta, abre un correo con el servicio en el asunto.
   */
  protected quote(service: string, event: Event): void {
    if (!document.getElementById('contact')) {
      const lang = this.transloco.getActiveLang();
      const email = this.siteContent.valueFor('contact_email', lang) || this.transloco.translate('ct_b');
      location.href = `mailto:${email}?subject=${encodeURIComponent(service)}`;
      return;
    }
    const detail: OpenContactDetail = { service, returnFocusTo: event.currentTarget as HTMLElement };
    window.dispatchEvent(new CustomEvent(OPEN_CONTACT_EVENT, { detail }));
  }
}
