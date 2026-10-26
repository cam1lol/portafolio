import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CollectionsService } from '../../core/data/collections.service';

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
  private readonly rows = toSignal(
    inject(CollectionsService).getPublished('ticker_items'),
    { initialValue: null },
  );

  readonly technologies = computed<readonly string[]>(() => {
    const rows = this.rows();

    if (!rows) {
      return DEFAULT_TECHNOLOGIES;
    }

    const items = rows
      .map((row) => String(row['label'] ?? '').trim())
      .filter((label) => label.length > 0);

    return items.length > 0 ? items : DEFAULT_TECHNOLOGIES;
  });
}