import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Tamaño del equipo como elección: "Solo yo" o un número de personas. Guarda el número ("1", "4"), que la
 * página del proyecto muestra en el idioma del visitante ("Solo yo" / "Solo", "4 personas" / "4 people").
 * Un valor antiguo de texto libre que empieza por un número ("3 personas") se lee como ese número.
 */
@Component({
  selector: 'app-team-picker',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TeamPickerComponent), multi: true }],
  template: `
    <div class="row" role="radiogroup" aria-label="Equipo">
      <button type="button" role="radio" [class.on]="size() === 1" [attr.aria-checked]="size() === 1" (click)="set(1)">SOLO YO</button>
      <button type="button" role="radio" [class.on]="size() > 1" [attr.aria-checked]="size() > 1" (click)="set(size() > 1 ? size() : 2)">EQUIPO</button>
      @if (size() > 1) {
        <input type="number" min="2" max="200" [value]="size()" (input)="set(+$any($event.target).value || 2)" aria-label="Personas en el equipo" />
        <span class="unit">personas</span>
      }
      @if (size()) { <button type="button" class="clear" (click)="set(0)" aria-label="Quitar equipo">QUITAR</button> }
    </div>
  `,
  styles: `
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button { padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); color: var(--steel); font: 11px 'Space Mono', monospace; letter-spacing: .06em; cursor: pointer; }
    button.on { border-color: var(--ember); color: var(--ember); }
    button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    input { width: 84px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); color: var(--bone); font: 15px 'Space Grotesk', sans-serif; }
    input:focus { outline: none; border-color: var(--ember); }
    .unit { color: var(--steel); font-size: 13px; }
  `,
})
export class TeamPickerComponent implements ControlValueAccessor {
  protected readonly size = signal(0);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const text = (value ?? '').trim().toLowerCase();
    const number = /^\d+/.exec(text);
    this.size.set(number ? Number(number[0]) : /^solo/.test(text) ? 1 : 0);
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected set(size: number): void {
    const value = Math.min(200, Math.max(0, Math.floor(size)));
    this.size.set(value);
    this.onChange(value ? String(value) : '');
    this.onTouched();
  }
}
