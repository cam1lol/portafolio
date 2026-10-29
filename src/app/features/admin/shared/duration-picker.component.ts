import { Component, effect, input, signal, untracked } from '@angular/core';
import { AbstractControl } from '@angular/forms';

type Unit = 'weeks' | 'months' | 'years';

const WORDS: Record<Unit, { es: [string, string]; en: [string, string] }> = {
  weeks: { es: ['semana', 'semanas'], en: ['week', 'weeks'] },
  months: { es: ['mes', 'meses'], en: ['month', 'months'] },
  years: { es: ['año', 'años'], en: ['year', 'years'] },
};

/** "3 meses", "1 year", "6 semanas"... -> cantidad y unidad; null si es texto libre. */
export function parseDuration(text: string): { amount: number; unit: Unit } | null {
  const match = /^\s*(\d{1,3})\s*([a-zñ]+)/i.exec(text ?? '');
  if (!match) return null;
  const word = match[2].toLowerCase();
  const unit: Unit | null = /^(sem|week)/.test(word) ? 'weeks' : /^(mes|month)/.test(word) ? 'months' : /^(a[ñn]o|year)/.test(word) ? 'years' : null;
  return unit ? { amount: Number(match[1]), unit } : null;
}

export function formatDuration(amount: number, unit: Unit, lang: 'es' | 'en'): string {
  const [one, many] = WORDS[unit][lang];
  return `${amount} ${amount === 1 ? one : many}`;
}

/**
 * Duración como cantidad + unidad en vez de texto libre: escribe a la vez el campo en español y en inglés
 * ("3 meses" / "3 months"), sin erratas y sin nada que traducir.
 */
@Component({
  selector: 'app-duration-picker',
  standalone: true,
  template: `
    <div class="row">
      <input type="number" min="1" max="120" step="1" [id]="inputId()" [value]="amount()" (input)="setAmount($any($event.target).value)" aria-label="Cantidad" />
      <div class="units" role="radiogroup" aria-label="Unidad">
        @for (unit of units; track unit) {
          <button type="button" role="radio" [class.on]="unitValue() === unit" [attr.aria-checked]="unitValue() === unit" (click)="setUnit(unit)">{{ label(unit) }}</button>
        }
      </div>
      @if (amount()) { <button type="button" class="clear" (click)="clear()" aria-label="Quitar duración">QUITAR</button> }
    </div>
    @if (amount()) { <span class="out mono">ES: {{ es().value }} · EN: {{ en().value }}</span> }
  `,
  styles: `
    :host { display: grid; gap: 6px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    input { width: 90px; padding: 11px 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); color: var(--bone); font: 15px 'Space Grotesk', sans-serif; }
    input:focus { outline: none; border-color: var(--ember); }
    .units { display: inline-flex; border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; }
    .units button, .clear { padding: 10px 14px; border: 0; background: var(--ink); color: var(--steel); font: 11px 'Space Mono', monospace; letter-spacing: .06em; cursor: pointer; }
    .units button + button { border-left: 1px solid var(--line); }
    .units button.on { background: var(--graphite-2); color: var(--ember); }
    .units button:focus-visible, .clear:focus-visible { outline: 2px solid var(--ember); outline-offset: -2px; }
    .clear { border: 1px solid var(--line); border-radius: var(--r); }
    .out { color: var(--steel); font-size: 10px; letter-spacing: .06em; }
  `,
})
export class DurationPickerComponent {
  readonly es = input.required<AbstractControl<string>>();
  readonly en = input.required<AbstractControl<string>>();
  readonly inputId = input<string | null>(null);

  protected readonly units: Unit[] = ['weeks', 'months', 'years'];
  protected readonly amount = signal<number | null>(null);
  protected readonly unitValue = signal<Unit>('months');

  constructor() {
    // Carga lo guardado (en cualquier idioma); el texto libre que no es una duración se queda como está.
    effect(() => {
      const es = this.es();
      const en = this.en();
      untracked(() => {
        const parsed = parseDuration(es.value) ?? parseDuration(en.value);
        if (parsed) {
          this.amount.set(parsed.amount);
          this.unitValue.set(parsed.unit);
        }
      });
    });
  }

  protected label(unit: Unit): string {
    return WORDS[unit].es[1].toUpperCase();
  }

  protected setAmount(raw: string): void {
    const value = Math.min(120, Math.max(0, Math.floor(Number(raw))));
    this.amount.set(value || null);
    this.write();
  }

  protected setUnit(unit: Unit): void {
    this.unitValue.set(unit);
    if (!this.amount()) this.amount.set(1);
    this.write();
  }

  protected clear(): void {
    this.amount.set(null);
    this.write();
  }

  private write(): void {
    const amount = this.amount();
    const es = amount ? formatDuration(amount, this.unitValue(), 'es') : '';
    const en = amount ? formatDuration(amount, this.unitValue(), 'en') : '';
    this.es().setValue(es);
    this.en().setValue(en);
    this.es().markAsDirty();
    this.en().markAsDirty();
  }
}
