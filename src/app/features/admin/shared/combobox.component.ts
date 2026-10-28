import { Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Text field with a visible list of suggestions (what you already used elsewhere): it opens when
 * the field gets the focus, filters while typing, and is driven with the arrows, Enter and Escape.
 * Anything new can still be typed. Works with formControlName like a plain input.
 */
@Component({
  selector: 'app-combobox',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ComboboxComponent), multi: true }],
  template: `
    <div class="combo" [class.open]="open() && visible().length">
      <input #field type="text" [id]="inputId()" [value]="value()" [attr.maxlength]="maxLength()" [placeholder]="placeholder()"
        role="combobox" autocomplete="off" [attr.aria-expanded]="open() && visible().length > 0" [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="active() >= 0 ? listId + '-' + active() : null"
        (input)="onInput(field.value)" (focus)="openList()" (blur)="onBlur()" (keydown)="onKey($event)" />
      <button type="button" class="toggle" tabindex="-1" aria-hidden="true" (mousedown)="$event.preventDefault(); toggle()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      @if (open() && visible().length) {
        <ul class="list" role="listbox" [id]="listId">
          <li class="list-head mono" aria-hidden="true">{{ value() ? 'COINCIDEN' : 'USADAS ANTES' }}</li>
          @for (option of visible(); track option; let i = $index) {
            <li role="option" [id]="listId + '-' + i" [class.active]="i === active()" [attr.aria-selected]="i === active()"
              (mousedown)="$event.preventDefault(); choose(option)">{{ option }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .combo { position: relative; }
    input { box-sizing: border-box; width: 100%; padding: 12px 40px 12px 14px; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); color: var(--bone); font: 15px/1.5 'Space Grotesk', sans-serif; }
    input:focus { outline: none; border-color: var(--ember); }
    :host(.ng-invalid.ng-touched) input { border-color: var(--ember); }
    .toggle { position: absolute; top: 50%; right: 8px; display: grid; place-items: center; width: 28px; height: 28px; translate: 0 -50%; border: 0; background: none; color: var(--steel); cursor: pointer; }
    .toggle svg { width: 16px; height: 16px; transition: transform .2s; }
    .combo.open .toggle svg { transform: rotate(180deg); }
    .list {
      position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; right: 0; max-height: 260px; overflow: auto; margin: 0; padding: 6px;
      list-style: none; border: 1px solid var(--line); border-radius: var(--r); background: var(--graphite-2); box-shadow: 0 18px 40px -18px rgba(0, 0, 0, .8);
    }
    .list-head { padding: 4px 8px 6px; color: var(--steel); font-size: 9px; letter-spacing: .12em; }
    [role='option'] { padding: 8px 10px; border-radius: 3px; color: var(--bone-dim); font-size: 14px; cursor: pointer; }
    [role='option']:hover, [role='option'].active { background: var(--ink); color: var(--ember); }
    @media (prefers-reduced-motion: reduce) { .toggle svg { transition: none; } }
  `,
})
export class ComboboxComponent implements ControlValueAccessor {
  private static nextId = 0;
  readonly options = input<string[]>([]);
  readonly inputId = input<string | null>(null);
  readonly placeholder = input('');
  readonly maxLength = input(120);

  protected readonly listId = `combo-list-${ComboboxComponent.nextId++}`;
  protected readonly value = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  /** Options that contain what is typed (all of them while empty), without the exact current value. */
  protected readonly visible = computed(() => {
    const query = this.value().trim().toLowerCase();
    return this.options()
      .filter((option) => option.toLowerCase() !== query && (!query || option.toLowerCase().includes(query)))
      .slice(0, 40);
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.field().nativeElement.disabled = disabled;
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.open.set(true);
    this.active.set(-1);
  }

  protected openList(): void {
    this.open.set(true);
  }

  protected toggle(): void {
    this.open.update((open) => !open);
    this.field().nativeElement.focus();
  }

  protected onBlur(): void {
    this.open.set(false);
    this.active.set(-1);
    this.onTouched();
  }

  protected choose(option: string): void {
    this.value.set(option);
    this.onChange(option);
    this.open.set(false);
    this.active.set(-1);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.visible().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open.set(true);
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.update((i) => (i + step + count) % count);
    } else if (event.key === 'Enter' && this.open() && this.active() >= 0) {
      event.preventDefault();
      this.choose(this.visible()[this.active()]);
    } else if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      this.open.set(false);
    }
  }
}
