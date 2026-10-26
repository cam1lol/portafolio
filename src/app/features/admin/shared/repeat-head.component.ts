import { Component, input, output } from '@angular/core';

/** Header of one item in a repeatable list: "Pantalla 2 de 5" plus move up/down and remove. */
@Component({
  selector: 'app-repeat-head',
  standalone: true,
  template: `
    <span class="repeat-index mono">{{ label() }} {{ index() + 1 }} <span class="of">de {{ count() }}</span></span>
    <div class="repeat-actions">
      <button type="button" [disabled]="index() === 0" (click)="moveUp.emit()" [attr.aria-label]="'Subir ' + label() + ' ' + (index() + 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
      </button>
      <button type="button" [disabled]="index() === count() - 1" (click)="moveDown.emit()" [attr.aria-label]="'Bajar ' + label() + ' ' + (index() + 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
      </button>
      <button type="button" class="remove" (click)="remove.emit()" [attr.aria-label]="'Quitar ' + label() + ' ' + (index() + 1)">QUITAR</button>
    </div>
  `,
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .repeat-index { color: var(--bone-dim); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    .of { color: var(--steel); }
    .repeat-actions { display: flex; align-items: center; gap: 4px; }
    button {
      display: grid; place-items: center; min-width: 30px; height: 30px; padding: 0 8px; border: 1px solid var(--line);
      border-radius: var(--r); background: none; color: var(--steel); font: 10px 'Space Mono', monospace; letter-spacing: .06em; cursor: pointer;
    }
    button:hover:not(:disabled) { border-color: var(--steel); color: var(--bone); }
    button.remove:hover { border-color: var(--ember); color: var(--ember); }
    button:disabled { opacity: .35; cursor: default; }
    button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    svg { width: 14px; height: 14px; }
  `,
})
export class RepeatHeadComponent {
  readonly label = input.required<string>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly remove = output<void>();
}
