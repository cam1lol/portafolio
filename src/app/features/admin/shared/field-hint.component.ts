import { Component, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { startWith } from 'rxjs';

/** Line under a field: where it shows on the site and a character counter when it has a limit. */
@Component({
  selector: 'app-field-hint',
  standalone: true,
  template: `
    @if (where()) { <span class="where">Se ve en: {{ where() }}</span> }
    @if (max()) { <span class="count mono" [class.near]="length() >= max()! * 0.9">{{ length() }} / {{ max() }}</span> }
  `,
  styles: `
    :host { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; color: var(--steel); font-size: 11px; line-height: 1.4; }
    .count { margin-left: auto; flex-shrink: 0; font-size: 10px; }
    .count.near { color: var(--ember); }
  `,
})
export class FieldHintComponent {
  readonly control = input.required<AbstractControl>();
  readonly max = input<number | null>(null);
  readonly where = input('');

  protected readonly length = signal(0);

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const sub = control.valueChanges
        .pipe(startWith(control.value))
        .subscribe((value) => this.length.set(String(value ?? '').length));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
