import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from './confirm-dialog.service';

/** Lo implementan los formularios del admin; el layout del admin también lo usa para avisar antes de cerrar la pestaña. */
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
