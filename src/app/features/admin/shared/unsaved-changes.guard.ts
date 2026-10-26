import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from './confirm-dialog.service';

/** Implemented by admin forms; the admin layout also uses it to warn before closing the tab. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<Partial<HasUnsavedChanges>> = async (component) => {
  if (!component?.hasUnsavedChanges?.()) return true;
  return inject(ConfirmDialogService).confirm({
    title: 'Cambios sin guardar',
    message: 'Si sales ahora se pierde lo que cambiaste en este formulario.',
    confirmLabel: 'SALIR SIN GUARDAR',
  });
};
