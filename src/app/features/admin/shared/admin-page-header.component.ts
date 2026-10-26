import { Component, input } from '@angular/core';
import { IconComponent } from '../../../shared/icons/icon.component';

/** Header shared by every admin screen: icon tile, title, one-line description, optional count and actions. */
@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    <header class="page-header">
      <span class="icon-tile" aria-hidden="true"><app-icon [name]="icon()" /></span>
      <div class="copy">
        <h1>{{ title() }}</h1>
        @if (description()) { <p class="description">{{ description() }}</p> }
      </div>
      @if (count() !== null) {
        <span class="count mono"><strong>{{ count() }}</strong> {{ countLabel() }}</span>
      }
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .page-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }
    .icon-tile {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border: 1px solid var(--line);
      border-radius: var(--r);
      background: linear-gradient(180deg, var(--graphite-2), var(--graphite));
      color: var(--ember);
    }
    .icon-tile app-icon { width: 20px; height: 20px; }
    h1 {
      margin: 0;
      color: var(--bone);
      font-family: 'Archivo', sans-serif;
      font-size: clamp(20px, 3vw, 26px);
      font-weight: 800;
      letter-spacing: -.02em;
      text-transform: uppercase;
    }
    .description { margin: 4px 0 0; color: var(--steel); font-size: 12px; line-height: 1.5; max-width: 640px; }
    .count { color: var(--steel); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
    .count strong { color: var(--bone); font-size: 18px; font-family: 'Archivo', sans-serif; letter-spacing: 0; margin-right: 4px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .actions:empty { display: none; }
    @media (max-width: 760px) {
      .page-header { grid-template-columns: auto minmax(0, 1fr); }
      .count, .actions { grid-column: 1 / -1; justify-content: flex-start; }
    }
  `,
})
export class AdminPageHeaderComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly count = input<number | null>(null);
  readonly countLabel = input('');
}
