import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TagInputComponent } from './tag-input.component';
import { FieldHintComponent } from './field-hint.component';
import { FormStep, FormStepsComponent } from './form-steps.component';
import { focusFirstInvalid } from './focus-first-invalid';

const tagControl = (value: string) => new FormControl(value, { nonNullable: true, validators: [Validators.maxLength(10)] });

function renderTags(values: string[] = []) {
  const array = new FormArray(values.map(tagControl));
  const parent = new FormGroup({ stack: array });
  const fixture = TestBed.createComponent(TagInputComponent);
  fixture.componentRef.setInput('array', array);
  fixture.componentRef.setInput('createControl', tagControl);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input')!;
  const type = (text: string, key = 'Enter') => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    fixture.detectChanges();
  };
  const chips = () => Array.from(root.querySelectorAll('.tag-text')).map((el) => el.textContent!.trim());
  return { fixture, root, input, array, parent, type, chips };
}

describe('TagInputComponent', () => {
  it('Enter agrega la etiqueta, marca el formulario como modificado y limpia el campo', () => {
    const { type, chips, parent, input } = renderTags(['Angular']);
    type('  Three.js ');
    expect(chips()).toEqual(['Angular', 'Three.js']);
    expect(parent.dirty).toBeTrue();
    expect(input.value).toBe('');
  });

  it('separa por comas y no repite etiquetas', () => {
    const { type, chips } = renderTags(['Angular']);
    type('angular, Supabase, ,RxJS');
    expect(chips()).toEqual(['Angular', 'Supabase', 'RxJS']);
  });

  it('la X quita una etiqueta y Retroceso con el campo vacío quita la última', () => {
    const { root, fixture, type, chips } = renderTags(['A', 'B', 'C']);
    (root.querySelector('[aria-label="Quitar A"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(chips()).toEqual(['B', 'C']);
    type('', 'Backspace');
    expect(chips()).toEqual(['B']);
  });

  it('marca la etiqueta que no cumple la validación', () => {
    const { root } = renderTags(['demasiado-largo-para-pasar']);
    expect(root.querySelector('.tag.invalid')).not.toBeNull();
    expect(root.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('FieldHintComponent', () => {
  it('muestra dónde se ve y el contador, que se actualiza al escribir', () => {
    const control = new FormControl('hola', { nonNullable: true });
    const fixture = TestBed.createComponent(FieldHintComponent);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('max', 10);
    fixture.componentRef.setInput('where', 'Tarjeta');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Se ve en: Tarjeta');
    expect(root.querySelector('.count')!.textContent!.trim()).toBe('4 / 10');
    control.setValue('casi lleno');
    fixture.detectChanges();
    expect(root.querySelector('.count')!.textContent!.trim()).toBe('10 / 10');
    expect(root.querySelector('.count.near')).not.toBeNull();
  });
});

@Component({
  standalone: true,
  imports: [FormStepsComponent, ReactiveFormsModule],
  template: `
    <app-form-steps [steps]="steps" [form]="form" />
    <form [formGroup]="form">
      <fieldset id="step-a"><input formControlName="name" /></fieldset>
      <fieldset id="step-b"><input formControlName="extra" /></fieldset>
    </form>
  `,
})
class StepsHostComponent {
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    extra: new FormControl('', { nonNullable: true }),
  });
  readonly steps: FormStep[] = [
    { id: 'step-a', label: 'Contenido', controls: [this.form.controls.name] },
    { id: 'step-b', label: 'Publicación', controls: [this.form.controls.extra] },
  ];
}

describe('FormStepsComponent', () => {
  it('lista los pasos y marca los errores solo después de tocar el campo', () => {
    const fixture = TestBed.createComponent(StepsHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const links = Array.from(root.querySelectorAll('.steps button')).map((b) => b.textContent!.replace(/\s+/g, ' ').trim());
    expect(links[0]).toContain('Contenido');
    expect(root.querySelector('.step-errors')).toBeNull();

    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    const badge = root.querySelector('.step-errors')!;
    expect(badge.textContent).toContain('1');
    expect(root.querySelectorAll('.step-errors').length).toBe(1);
  });

  it('focusFirstInvalid lleva el foco al primer campo con error', () => {
    const fixture = TestBed.createComponent(StepsHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    document.body.appendChild(root);
    focusFirstInvalid(root);
    expect(document.activeElement).toBe(root.querySelector('[formcontrolname="name"]'));
    root.remove();
  });
});
