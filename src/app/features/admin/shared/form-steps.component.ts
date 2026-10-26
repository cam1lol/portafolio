import { Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { focusFirstInvalid } from './focus-first-invalid';

export interface FormStep {
  /** id of the fieldset the step jumps to. */
  id: string;
  label: string;
  /** Controls checked for the error count of this step. */
  controls: AbstractControl[];
}

/**
 * Step index above a long form: jumps to each fieldset and shows how many fields have errors
 * (only once they were touched, so a new form does not start all red).
 */
@Component({
  selector: 'app-form-steps',
  standalone: true,
  template: `
    <nav class="steps" aria-label="Pasos del formulario">
      @for (step of steps(); track step.id; let i = $index) {
        <button type="button" (click)="go(step)">
          <span class="step-no mono">{{ i + 1 }}</span>
          <span class="step-label">{{ step.label }}</span>
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
      cursor: pointer; transition: border-color .18s, color .18s;
    }
    button:hover { border-color: var(--steel); color: var(--bone); }
    button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    .step-no { color: var(--steel); font-size: 10px; }
    .step-errors {
      display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: var(--ember); color: var(--ink); font-size: 10px; font-weight: 700;
    }
    .req-note { color: var(--steel); font-size: 11px; }
    .req { color: var(--ember); font: 700 14px/1 'Space Grotesk', sans-serif; }
    /* On phones the bar wraps to several rows, so it scrolls away instead of covering the form. */
    @media (max-width: 760px) { :host { position: static; } button { padding: 6px 10px; } }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `,
})
export class FormStepsComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly steps = input.required<FormStep[]>();
  /** Root form, only used to know when to recount. */
  readonly form = input.required<AbstractControl>();

  /** Bumped on every form event (value, status, touched) so the counts recompute. */
  private readonly tick = signal(0);

  protected readonly errors = computed(() => {
    this.tick();
    return this.steps().map((step) => step.controls.filter((control) => control.invalid && control.touched).length);
  });

  constructor() {
    effect((onCleanup) => {
      const sub = this.form().events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected go(step: FormStep): void {
    const target = document.getElementById(step.id);
    if (!target) return;
    const index = this.steps().indexOf(step);
    if (this.errors()[index]) {
      focusFirstInvalid(target);
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Leave room for the site header and this bar (when it is sticky) above the fieldset.
    const bar = this.host.nativeElement as HTMLElement;
    const offset = (getComputedStyle(bar).position === 'sticky' ? parseFloat(getComputedStyle(bar).top) + bar.offsetHeight : 0) + 12;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}
