import { Component, booleanAttribute, input, output } from '@angular/core';

/**
 * Cabecera de un elemento de una lista repetible: "Pantalla 2 de 5" más subir/bajar y quitar.
 * Con `collapsible`, la etiqueta se vuelve un botón que además muestra un resumen en una línea (y una
 * miniatura) del elemento, así las listas largas se pliegan en un índice compacto; la página oculta el
 * cuerpo del elemento mientras `expanded` es false.
 */
@Component({
  selector: 'app-repeat-head',
  standalone: true,
  template: `
    @if (collapsible()) {
      <button type="button" class="toggle" [attr.aria-expanded]="expanded()" (click)="toggle.emit()">
        <svg class="chev" [class.open]="expanded()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        @if (thumb()) { <img class="thumb" [src]="thumb()" alt="" /> }
        <span class="repeat-index mono">{{ label() }} {{ index() + 1 }} <span class="of">de {{ count() }}</span></span>
        <span class="summary" [class.muted]="!summary()">{{ summary() || 'Sin título' }}</span>
        @if (invalid()) { <span class="err mono">REVISAR</span> }
      </button>
    } @else {
      <span class="repeat-index mono">{{ label() }} {{ index() + 1 }} <span class="of">de {{ count() }}</span></span>
    }
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
    :host(.folded) { margin-bottom: 10px; }
    .repeat-index { flex: none; color: var(--bone-dim); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    .of { color: var(--steel); }
    .repeat-actions { display: flex; flex: none; align-items: center; gap: 4px; }
    button {
      display: grid; place-items: center; min-width: 30px; height: 30px; padding: 0 8px; border: 1px solid var(--line);
      border-radius: var(--r); background: none; color: var(--steel); font: 10px 'Space Mono', monospace; letter-spacing: .06em; cursor: pointer;
    }
    button:hover:not(:disabled) { border-color: var(--steel); color: var(--bone); }
    button.remove:hover { border-color: var(--ember); color: var(--ember); }
    button:disabled { opacity: .35; cursor: default; }
    button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    svg { width: 14px; height: 14px; }

    .toggle { display: flex; flex: 1; align-items: center; justify-content: flex-start; gap: 10px; min-width: 0; height: auto; min-height: 34px; padding: 4px 8px 4px 4px; border-color: transparent; text-align: left; }
    .toggle:hover:not(:disabled) { border-color: var(--line); }
    .chev { flex: none; color: var(--steel); transition: transform .18s; }
    .chev.open { transform: rotate(90deg); color: var(--ember); }
    .thumb { flex: none; width: 44px; height: 28px; border: 1px solid var(--line); border-radius: 2px; object-fit: cover; background: var(--ink); }
    .summary { min-width: 0; overflow: hidden; color: var(--bone); font: 13px 'Space Grotesk', sans-serif; letter-spacing: 0; text-overflow: ellipsis; white-space: nowrap; }
    .summary.muted { color: var(--steel); font-style: italic; }
    .err { flex: none; padding: 2px 6px; border-radius: 999px; background: var(--ember); color: var(--ink); font-size: 9px; font-weight: 700; }
    @media (max-width: 560px) { .repeat-index .of { display: none; } .thumb { display: none; } }
    @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
  `,
  host: { '[class.folded]': 'collapsible() && !expanded()' },
})
export class RepeatHeadComponent {
  readonly label = input.required<string>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly collapsible = input(false, { transform: booleanAttribute });
  readonly expanded = input(true);
  readonly summary = input('');
  readonly thumb = input('');
  readonly invalid = input(false);
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly remove = output<void>();
  readonly toggle = output<void>();
}
