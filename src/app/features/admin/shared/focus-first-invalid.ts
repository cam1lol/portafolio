const INVALID_FIELD = 'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, input[aria-invalid="true"]';

/** Tras un guardado fallido: baja hasta el primer campo con error y lo enfoca. */
export function focusFirstInvalid(root: HTMLElement): void {
  const field = root.querySelector<HTMLElement>(INVALID_FIELD);
  if (!field) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  field.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  field.focus({ preventScroll: true });
}
