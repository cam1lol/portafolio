import { isValidSlug, slugify } from './project-media';

describe('slugify', () => {
  it('pasa a minúsculas, quita acentos y usa guiones', () => {
    expect(slugify('Velamentum Store')).toBe('velamentum-store');
    expect(slugify('Cauce — Finanzas Ñandú')).toBe('cauce-finanzas-nandu');
    expect(slugify('  control  Panel 2.0 ')).toBe('control-panel-2-0');
  });
  it('recorta a 80 caracteres sin dejar guion final', () => {
    const slug = slugify(`${'a'.repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBeFalse();
  });
});

describe('isValidSlug', () => {
  it('acepta solo minúsculas, números y guiones simples', () => {
    expect(isValidSlug('velamentum-store')).toBeTrue();
    expect(isValidSlug('Velamentum')).toBeFalse();
    expect(isValidSlug('doble--guion')).toBeFalse();
    expect(isValidSlug('-borde')).toBeFalse();
    expect(isValidSlug('a')).toBeFalse();
  });
});
