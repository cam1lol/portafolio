import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CollectionsService } from '../../core/data/collections.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';

type LogKind = 'now' | 'launch' | 'learning' | 'note';

interface LogLine {
  id: string;
  kind: LogKind;
  date: string;
  text: string;
  url: string;
}

const KINDS: LogKind[] = ['now', 'launch', 'learning', 'note'];
/** Líneas que se muestran en la portada (las más nuevas primero). */
const MAX_LINES = 6;

/**
 * Bitácora (admin > Bitácora, migración 0014): las últimas notas fechadas como registro HUD. Ordenadas
 * por fecha (las más nuevas primero), sea cual sea el orden en el admin. No pinta nada sin notas publicadas.
 */
@Component({
  selector: 'app-log',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent, TranslocoPipe],
  templateUrl: './log.component.html',
  styleUrl: './log.component.css',
})
export class LogComponent {
  private readonly rows = toSignal(inject(CollectionsService).getPublished('log_entries'), { initialValue: null });
  private readonly lang = toSignal(inject(TranslocoService).langChanges$, { initialValue: 'es' });

  protected readonly lines = computed<LogLine[]>(() => {
    const en = this.lang() === 'en';
    const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? '').trim();
    return (this.rows() ?? [])
      .map((row) => {
        const kind = text(row, 'kind') as LogKind;
        return {
          id: row.id,
          kind: KINDS.includes(kind) ? kind : 'note',
          date: text(row, 'entry_date'),
          text: (en && text(row, 'text_en')) || text(row, 'text_es'),
          url: text(row, 'url'),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_LINES);
  });

  /** 2026-10-27 -> 27.10.26 (compacto, igual en los dos idiomas). */
  protected shortDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}.${m}.${y.slice(2)}` : iso;
  }
}
