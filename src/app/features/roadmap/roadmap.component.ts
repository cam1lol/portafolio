import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { CollectionRow, CollectionsService } from '../../core/data/collections.service';

interface RoadmapCard {
  id: string;
  when: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, SectionHeadComponent],
  templateUrl: './roadmap.component.html',
  styleUrl: './roadmap.component.css',
})
export class RoadmapComponent {
  private readonly transloco = inject(TranslocoService);

  /** `null` = sin cargar o tabla ausente: la plantilla usa las tarjetas de serie del i18n. */
  private readonly rows = toSignal(inject(CollectionsService).getPublished('roadmap_items'), { initialValue: null });

  protected readonly cards = computed<RoadmapCard[] | null>(() => {
    const rows = this.rows();
    if (!rows) return null;
    const lang = this.transloco.activeLang() === 'en' ? 'en' : 'es';
    return rows.map((row: CollectionRow) => ({
      id: row.id,
      when: String(row[`when_${lang}`] ?? ''),
      title: String(row[`title_${lang}`] ?? ''),
      description: String(row[`description_${lang}`] ?? ''),
    }));
  });
}
