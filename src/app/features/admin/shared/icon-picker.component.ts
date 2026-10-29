import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { IconComponent } from '../../../shared/icons/icon.component';
import { PROJECT_ICONS } from '../../../shared/icons/icon-catalog';

/**
 * Elección visual del icono de un proyecto: todos los iconos del catálogo con su animación, como grupo
 * de radio (las flechas mueven, Espacio/Enter elige). Un valor fuera del catálogo (proyectos antiguos)
 * se conserva y se muestra como opción extra "actual", así no se pierde nada.
 */
@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="grid" role="radiogroup" [attr.aria-labelledby]="labelledBy()" (keydown)="onKey($event)">
      @for (icon of options(); track icon.name; let i = $index) {
        <button type="button" role="radio" class="opt" [class.on]="icon.name === current()"
          [attr.aria-checked]="icon.name === current()" [attr.tabindex]="icon.name === focusName() ? 0 : -1"
          [attr.data-index]="i" (click)="pick(icon.name)">
          <app-icon [name]="icon.name" animated />
          <span class="mono">{{ icon.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
    .opt {
      display: grid; justify-items: center; gap: 8px; padding: 14px 6px 10px;
      border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); color: var(--bone-dim); cursor: pointer;
      transition: border-color .2s, color .2s, background .2s;
    }
    .opt app-icon { width: 22px; height: 22px; color: var(--ember); }
    .opt span { font-size: 9px; letter-spacing: .06em; text-align: center; line-height: 1.3; }
    .opt:hover { border-color: var(--steel); color: var(--bone); }
    .opt.on { border-color: var(--ember); background: var(--ember-soft); color: var(--bone); }
    .opt:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
  `,
})
export class IconPickerComponent {
  readonly value = input('');
  /** Id de la etiqueta visible, para el nombre accesible del grupo de radio. */
  readonly labelledBy = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly current = linkedSignal(() => this.value());

  /** El catálogo, más el valor guardado si no está en él. */
  protected readonly options = computed(() => {
    const value = this.current();
    const known = PROJECT_ICONS.some((icon) => icon.name === value);
    return value && !known ? [...PROJECT_ICONS, { name: value, label: `Actual: ${value}` }] : PROJECT_ICONS;
  });

  /** Tabindex itinerante: la opción elegida, o la primera. */
  protected readonly focusName = computed(() => this.current() || this.options()[0]?.name);

  protected pick(name: string): void {
    this.current.set(name);
    this.valueChange.emit(name);
  }

  /** Las flechas se mueven entre opciones y eligen, como los radio buttons nativos. */
  protected onKey(event: KeyboardEvent): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const list = this.options();
    const index = list.findIndex((icon) => icon.name === this.current());
    const next = list[(Math.max(0, index) + step + list.length) % list.length];
    this.pick(next.name);
    const grid = (event.currentTarget as HTMLElement);
    queueMicrotask(() => grid.querySelector<HTMLElement>(`[data-index="${list.indexOf(next)}"]`)?.focus());
  }
}
