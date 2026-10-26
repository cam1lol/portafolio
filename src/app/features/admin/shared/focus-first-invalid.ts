const INVALID_FIELD = 'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, input[aria-invalid="true"]';

/** After a failed save: scrolls to the first field with an error and focuses it. */
export function focusFirstInvalid(root: HTMLElement): void {
  const field = root.querySelector<HTMLElement>(INVALID_FIELD);
  if (!field) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  field.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  field.focus({ preventScroll: true });
}
