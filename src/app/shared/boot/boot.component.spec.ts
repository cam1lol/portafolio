import { BootComponent } from './boot.component';

describe('BootComponent.shouldShow', () => {
  const KEY = 'ca-boot-seen-v1';
  let reduce = false;

  beforeEach(() => {
    localStorage.removeItem(KEY);
    reduce = false;
    spyOn(window, 'matchMedia').and.callFake((query: string) => ({ matches: query.includes('reduce') && reduce }) as MediaQueryList);
  });
  afterEach(() => localStorage.removeItem(KEY));

  it('se muestra una sola vez, en la primera visita a la portada', () => {
    expect(BootComponent.shouldShow('/')).toBeTrue();
    expect(BootComponent.shouldShow('/')).toBeFalse();
  });

  it('no aparece al entrar por otra página ni con movimiento reducido', () => {
    expect(BootComponent.shouldShow('/proyectos/cauce')).toBeFalse();
    reduce = true;
    expect(BootComponent.shouldShow('/')).toBeFalse();
  });
});
