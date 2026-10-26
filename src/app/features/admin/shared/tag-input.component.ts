import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';

/**
 * Short lists (stack, technologies) written as tags: Enter or comma adds, the X removes,
 * Backspace on the empty field removes the last one. Edits the FormArray in place, so the
 * parent form becomes dirty and keeps its validators.
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  template: `
    <div class="tag-box" [class.invalid]="hasInvalid()" (click)="field.focus()">
      <ul class="tags" aria-label="Elementos agregados">
        @for (control of array().controls; track control; let i = $index) {
          <li class="tag" [class.invalid]="control.invalid" [attr.title]="control.invalid ? 'Demasiado largo o con caracteres no válidos' : null">
            <span class="tag-text">{{ control.value }}</span>
            <button type="button" class="tag-remove" [attr.aria-label]="'Quitar ' + control.value" (click)="remove(i); $event.stopPropagation()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </li>
        }
      </ul>
      <input #field type="text" [id]="inputId()" [placeholder]="array().length ? '' : placeholder()"
        [attr.maxlength]="maxLength()" [attr.aria-invalid]="hasInvalid()"
        (input)="draft.set(field.value)" (keydown)="onKeydown($event)" (blur)="commit()" />
    </div>
    <span class="tag-help">Escribe y pulsa Enter o coma para agregar. Retroceso con el campo vacío quita la última.</span>
  `,
  styles: `
    :host { display: grid; gap: 6px; }
    .tag-box {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 42px; padding: 6px 8px;
      border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); cursor: text;
    }
    .tag-box:focus-within { border-color: var(--ember); }
    .tag-box.invalid { border-color: var(--ember); }
    .tags { display: contents; margin: 0; padding: 0; list-style: none; }
    .tag {
      display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 3px 4px 3px 9px;
      border: 1px solid var(--line); border-radius: 999px; background: var(--graphite-2); color: var(--bone);
      font: 12px 'Space Grotesk', sans-serif;
    }
    .tag.invalid { border-color: var(--ember); color: var(--ember); }
    .tag-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag-remove {
      display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%;
      background: none; color: var(--steel); cursor: pointer;
    }
    .tag-remove:hover, .tag-remove:focus-visible { background: var(--line); color: var(--bone); outline: none; }
    .tag-remove svg { width: 12px; height: 12px; }
    input {
      flex: 1 1 120px; min-width: 0; padding: 4px; border: 0; background: none; color: var(--bone);
      font: 13px 'Space Grotesk', sans-serif;
    }
    input:focus { outline: none; }
    .tag-help { color: var(--steel); font-size: 11px; }
  `,
})
export class TagInputComponent {
  readonly array = input.required<FormArray<FormControl<string>>>();
  /** Builds each new control, so the tags keep the same validators as before. */
  readonly createControl = input.required<(value: string) => FormControl<string>>();
  readonly inputId = input<string | null>(null);
  readonly placeholder = input('Por ejemplo: Angular');
  readonly maxLength = input(80);

  protected readonly draft = signal('');
  private readonly fieldRef = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected hasInvalid(): boolean {
    return this.array().controls.some((control) => control.invalid);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commit();
    } else if (event.key === 'Backspace' && !this.draft() && this.array().length) {
      this.remove(this.array().length - 1);
    }
  }

  /** Adds what is typed (comma separated), skipping blanks and case-insensitive duplicates. */
  protected commit(): void {
    const array = this.array();
    const existing = new Set(array.controls.map((control) => control.value.toLowerCase()));
    let added = false;
    for (const raw of this.draft().split(',')) {
      const value = raw.trim();
      if (!value || existing.has(value.toLowerCase())) continue;
      existing.add(value.toLowerCase());
      array.push(this.createControl()(value));
      added = true;
    }
    this.draft.set('');
    this.fieldRef().nativeElement.value = '';
    if (added) array.markAsDirty();
  }

  protected remove(index: number): void {
    this.array().removeAt(index);
    this.array().markAsDirty();
  }
}
