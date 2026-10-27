import { TestBed } from '@angular/core/testing';
import { IconPickerComponent } from './icon-picker.component';
import { PROJECT_ICONS } from '../../../shared/icons/icon-catalog';

function setup(value: string) {
  const fixture = TestBed.createComponent(IconPickerComponent);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  const emitted: string[] = [];
  fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
  return { fixture, root: fixture.nativeElement as HTMLElement, emitted };
}

describe('IconPickerComponent', () => {
  it('muestra todo el catálogo animado y marca el elegido', () => {
    const { root } = setup('code');
    const options = root.querySelectorAll('[role=radio]');
    expect(options.length).toBe(PROJECT_ICONS.length);
    expect(root.querySelectorAll('app-icon[data-anim]').length).toBe(PROJECT_ICONS.length);
    const checked = root.querySelector('[aria-checked=true]')!;
    expect(checked.textContent).toContain('Código');
    expect(checked.getAttribute('tabindex')).toBe('0');
  });

  it('al hacer clic emite el nombre del icono', () => {
    const { fixture, root, emitted } = setup('box');
    (Array.from(root.querySelectorAll<HTMLButtonElement>('[role=radio]')).find((b) => b.textContent!.includes('Base de datos'))!).click();
    fixture.detectChanges();
    expect(emitted).toEqual(['database']);
    expect(root.querySelector('[aria-checked=true]')!.textContent).toContain('Base de datos');
  });

  it('conserva un icono guardado que no está en el catálogo', () => {
    const { root } = setup('anchor');
    expect(root.querySelectorAll('[role=radio]').length).toBe(PROJECT_ICONS.length + 1);
    expect(root.querySelector('[aria-checked=true]')!.textContent).toContain('Actual: anchor');
  });

  it('las flechas eligen el siguiente o el anterior', () => {
    const { root, emitted } = setup(PROJECT_ICONS[0].name);
    const group = root.querySelector('[role=radiogroup]')!;
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(emitted).toEqual([PROJECT_ICONS[1].name, PROJECT_ICONS[0].name]);
  });
});
