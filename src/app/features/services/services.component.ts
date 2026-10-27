import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { CollectionRow, CollectionsService } from '../../core/data/collections.service';

interface ServiceCard {
  id: string;
  title: string;
  description: string;
  price: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, SectionHeadComponent, TiltDirective],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
})
export class ServicesComponent {
  private readonly transloco = inject(TranslocoService);

  /** `null` = not loaded or table missing: the template keeps the built-in i18n cards. */
  private readonly rows = toSignal(inject(CollectionsService).getPublished('services'), { initialValue: null });

  protected readonly cards = computed<ServiceCard[] | null>(() => {
    const rows = this.rows();
    if (!rows) return null;
    const lang = this.transloco.activeLang() === 'en' ? 'en' : 'es';
    return rows.map((row: CollectionRow) => ({
      id: row.id,
      title: String(row[`title_${lang}`] ?? ''),
      description: String(row[`description_${lang}`] ?? ''),
      price: String(row[`price_${lang}`] ?? ''),
    }));
  });

  protected index(position: number): string {
    return `S/${(position + 1).toString().padStart(2, '0')}`;
  }
}
