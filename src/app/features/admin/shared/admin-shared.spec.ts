import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { unsavedChangesGuard } from './unsaved-changes.guard';
import { ConfirmDialogService } from './confirm-dialog.service';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { controlHasValue } from './form-steps.component';

describe('ToastService', () => {
  it('muestra un aviso y lo retira solo a los 3,5 s', fakeAsync(() => {
    const toasts = TestBed.inject(ToastService);
    toasts.show('Guardado');
    expect(toasts.items().map((toast) => [toast.message, toast.kind])).toEqual([['Guardado', 'ok']]);
    tick(3499);
    expect(toasts.items().length).toBe(1);
    tick(1);
    expect(toasts.items().length).toBe(0);
  }));

  it('se puede cerrar a mano y admite avisos de error', () => {
    const toasts = TestBed.inject(ToastService);
    toasts.show('No se pudo guardar', 'error');
    const [toast] = toasts.items();
    expect(toast.kind).toBe('error');
    toasts.dismiss(toast.id);
    expect(toasts.items().length).toBe(0);
  });
});

describe('unsavedChangesGuard', () => {
  let confirm: jasmine.Spy;

  beforeEach(() => {
    confirm = jasmine.createSpy('confirm');
    TestBed.configureTestingModule({ providers: [{ provide: ConfirmDialogService, useValue: { confirm } }] });
  });

  const run = (component: unknown) =>
    TestBed.runInInjectionContext(() => unsavedChangesGuard(component as never, null as never, null as never, null as never));

  it('deja salir sin preguntar si no hay cambios', async () => {
    expect(await run({ hasUnsavedChanges: () => false })).toBeTrue();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('pregunta si hay cambios y respeta la respuesta', async () => {
    confirm.and.resolveTo(false);
    expect(await run({ hasUnsavedChanges: () => true })).toBeFalse();
    expect(confirm).toHaveBeenCalledWith(jasmine.objectContaining({ confirmLabel: 'SALIR SIN GUARDAR' }));
  });

  it('deja salir si el componente no informa cambios', async () => {
    expect(await run({})).toBeTrue();
  });
});

describe('controlHasValue (estado de cada paso en el raíl)', () => {
  it('cuenta texto, casillas marcadas, listas con elementos y grupos con algo dentro', () => {
    expect(controlHasValue(new FormControl('  '))).toBeFalse();
    expect(controlHasValue(new FormControl('Hola'))).toBeTrue();
    expect(controlHasValue(new FormControl(false))).toBeFalse();
    expect(controlHasValue(new FormControl(true))).toBeTrue();
    expect(controlHasValue(new FormControl<string[]>([]))).toBeFalse();
    expect(controlHasValue(new FormArray([]))).toBeFalse();
    expect(controlHasValue(new FormArray([new FormControl('')]))).toBeTrue();
    expect(controlHasValue(new FormGroup({ a: new FormControl(''), b: new FormControl('') }))).toBeFalse();
    expect(controlHasValue(new FormGroup({ a: new FormControl(''), b: new FormControl('2025') }))).toBeTrue();
  });
});
