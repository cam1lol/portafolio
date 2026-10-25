import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CollectionsService } from '../../core/data/collections.service';

/** Built-in list, used until `ticker_items` loads or if the table does not exist yet. */
const DEFAULT_TECHNOLOGIES: readonly string[] = [
  'Angular',
  'TypeScript',
  'Three.js',
  'Blender',
  'Java',
  'Spring Boot',
  'Node.js',
  'Vue 3',
  'Ionic',
  'AWS',
  'Python',
  'FastAPI',
];

@Component({
  selector: 'app-ticker',
  standalone: true,
  templateUrl: './ticker.component.html',
  styleUrl: './ticker.component.css',
})
export class TickerComponent {
  private readonly rows = toSignal(inject(CollectionsService).getPublished('ticker_items'), { initialValue: null });

  readonly technologies = computed<readonly string[]>(() => {
    const rows = this.rows();
    return rows ? rows.map((row) => String(row['label'] ?? '')) : DEFAULT_TECHNOLOGIES;
  });
}
