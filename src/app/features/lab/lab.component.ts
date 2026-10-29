import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '../../shared/icons/icon.component';
import { CollectionsService } from '../../core/data/collections.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { PlayWhileVisibleDirective } from '../../shared/media/play-while-visible.directive';

interface LabItem {
  id: string;
  title: string;
  description: string;
  video: string;
  poster: string;
  tags: string[];
  url: string;
}

/**
 * Laboratorio (admin > Laboratorio, migración 0014): experimentos como clips en bucle que solo se
 * reproducen mientras se ven. El inglés recurre al español. No pinta nada si no hay nada publicado.
 */
@Component({
  selector: 'app-lab',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent, PlayWhileVisibleDirective, TranslocoPipe, IconComponent],
  templateUrl: './lab.component.html',
  styleUrl: './lab.component.css',
})
export class LabComponent {
  private readonly rows = toSignal(inject(CollectionsService).getPublished('lab_items'), { initialValue: null });
  private readonly lang = toSignal(inject(TranslocoService).langChanges$, { initialValue: 'es' });

  protected readonly items = computed<LabItem[]>(() => {
    const en = this.lang() === 'en';
    const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? '').trim();
    return (this.rows() ?? []).map((row) => ({
      id: row.id,
      title: (en && text(row, 'title_en')) || text(row, 'title_es'),
      description: (en && text(row, 'description_en')) || text(row, 'description_es'),
      video: text(row, 'video'),
      poster: text(row, 'poster'),
      tags: text(row, 'tags').split(',').map((tag) => tag.trim()).filter(Boolean),
      url: text(row, 'url'),
    }));
  });

  protected index(i: number): string {
    return `EXP-${String(i + 1).padStart(2, '0')}`;
  }
}
