import { Component, ElementRef, computed, effect, inject, input, model, signal } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { focusFirstInvalid } from './focus-first-invalid';

export interface FormStep {
  /** id del fieldset al que salta el paso. */
  id: string;
  label: string;
  /** Controles que cuentan para los errores de este paso. */
  controls: AbstractControl[];
}

/** Si un control tiene algo que mostrar (texto, una casilla marcada, elementos de lista). */
export function controlHasValue(control: AbstractControl): boolean {
  if (control instanceof FormArray) return control.length > 0;
  if (control instanceof FormGroup) return Object.values(control.controls).some(controlHasValue);
  const value = control.value;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return value === true;
}

/**
 * Índice de pasos de un formulario; muestra cuántos campos tienen errores (solo tras tocarlos, para que
 * un formulario nuevo no empiece todo en rojo).
 * - `scroll` (por defecto): una barra fija sobre un formulario largo; cada paso salta a su fieldset.
 * - `rail`: una lista vertical junto al formulario, con un paso a la vez (la página oculta los demás
 *   con `active`); cada paso indica además si tiene contenido.
 */
@Component({
  selector: 'app-form-steps',
  standalone: true,
  host: { '[class.rail]': "mode() === 'rail'" },
  template: `
    <nav class="steps" aria-label="Pasos del formulario">
      @for (step of steps(); track step.id; let i = $index) {
        <button type="button" (click)="go(step)" [class.active]="mode() === 'rail' && active() === i" [attr.aria-current]="mode() === 'rail' && active() === i ? 'step' : null">
          <span class="step-no mono">{{ mode() === 'rail' ? (i + 1).toString().padStart(2, '0') : i + 1 }}</span>
          <span class="step-text">
            <span class="step-label">{{ step.label }}</span>
            @if (mode() === 'rail') {
              <span class="step-state mono" [class.has]="filled()[i]">{{ errors()[i] ? 'REVISAR' : filled()[i] ? 'CON CONTENIDO' : 'VACÍO' }}</span>
            }
          </span>
          @if (errors()[i]; as count) {
            <span class="step-errors mono" [attr.aria-label]="count + (count === 1 ? ' campo con error' : ' campos con error')">{{ count }}</span>
          }
        </button>
      }
    </nav>
    <span class="req-note"><span class="req" aria-hidden="true">*</span> Obligatorio</span>
  `,
  styles: `
    :host {
      position: sticky; top: var(--site-header-h); z-index: 3; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 8px 16px; margin: 0 0 18px; padding: 10px 0; border-bottom: 1px solid var(--line);
      background: var(--ink);
    }
    .steps { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
    button {
      display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border: 1px solid var(--line);
      border-radius: 999px; background: var(--graphite); color: var(--bone-dim); font: 12px 'Space Grotesk', sans-serif;
      cursor: pointer; transition: border-color .18s, color .18s, background-color .18s;
    }
    button:hover { border-color: var(--steel); color: var(--bone); }
    button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    .step-no { color: var(--steel); font-size: 10px; }
    .step-text { display: flex; flex-direction: column; min-width: 0; text-align: left; }
    .step-errors {
      display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: var(--ember); color: var(--ink); font-size: 10px; font-weight: 700;
    }
    .req-note { color: var(--steel); font-size: 11px; }
    .req { color: var(--ember); font: 700 14px/1 'Space Grotesk', sans-serif; }

    /* ---- Carril: lista vertical, con el paso activo iluminado en acento. */
    :host(.rail) { top: calc(var(--site-header-h) + 16px); flex-direction: column; align-items: stretch; flex-wrap: nowrap; margin: 0; padding: 0; border: 0; background: none; }
    :host(.rail) .steps { flex-direction: column; flex-wrap: nowrap; gap: 2px; }
    :host(.rail) button { position: relative; width: 100%; gap: 12px; padding: 10px 12px; border: 0; border-left: 2px solid var(--line); border-radius: 0; background: none; }
    :host(.rail) button:hover { background: var(--graphite); }
    :host(.rail) button.active { border-left-color: var(--ember); background: var(--graphite); color: var(--bone); }
    :host(.rail) button.active .step-no { color: var(--ember); }
    :host(.rail) .step-label { font-size: 13px; }
    :host(.rail) .step-state { margin-top: 2px; color: var(--steel); font-size: 9px; letter-spacing: .1em; }
    :host(.rail) .step-state.has { color: var(--good); }
    :host(.rail) .step-errors { margin-left: auto; }
    :host(.rail) .req-note { margin-top: 14px; padding-left: 14px; }

    /* En móvil la barra ocupa varias filas, así que se va con el scroll en vez de tapar el formulario. */
    @media (max-width: 760px) { :host { position: static; } button { padding: 6px 10px; } }
    /* Carril en pantallas estrechas: una franja horizontal de pasos que se desplaza de lado. */
    @media (max-width: 1100px) {
      :host(.rail) { position: static; margin-bottom: 18px; }
      :host(.rail) .steps { flex-direction: row; overflow-x: auto; scrollbar-width: thin; padding-bottom: 4px; }
      :host(.rail) button { flex: 0 0 auto; width: auto; border-left: 0; border-bottom: 2px solid var(--line); }
      :host(.rail) button.active { border-bottom-color: var(--ember); }
      :host(.rail) .step-state { display: none; }
      :host(.rail) .req-note { margin-top: 8px; padding-left: 0; }
    }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `,
})
export class FormStepsComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly steps = input.required<FormStep[]>();
  /** Formulario raíz, solo para saber cuándo recontar. */
  readonly form = input.required<AbstractControl>();
  readonly mode = input<'scroll' | 'rail'>('scroll');
  /** Modo rail: índice del paso en pantalla. */
  readonly active = model(0);

  /** Se incrementa con cada evento del formulario (valor, estado, tocado) para recalcular los contadores. */
  private readonly tick = signal(0);

  protected readonly errors = computed(() => {
    this.tick();
    return this.steps().map((step) => step.controls.filter((control) => control.invalid && control.touched).length);
  });

  protected readonly filled = computed(() => {
    this.tick();
    return this.steps().map((step) => step.controls.some(controlHasValue));
  });

  constructor() {
    effect((onCleanup) => {
      const sub = this.form().events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected go(step: FormStep): void {
    const index = this.steps().indexOf(step);
    if (this.mode() === 'rail') {
      this.active.set(index);
      // El fieldset se muestra en el siguiente render; luego su primer error (si lo hay) recibe el foco.
      if (this.errors()[index]) setTimeout(() => {
        const target = document.getElementById(step.id);
        if (target) focusFirstInvalid(target);
      });
      return;
    }

    const target = document.getElementById(step.id);
    if (!target) return;
    if (this.errors()[index]) {
      focusFirstInvalid(target);
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Deja sitio para la cabecera del sitio y esta barra (si es fija) sobre el fieldset.
    const bar = this.host.nativeElement as HTMLElement;
    const offset = (getComputedStyle(bar).position === 'sticky' ? parseFloat(getComputedStyle(bar).top) + bar.offsetHeight : 0) + 12;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}
