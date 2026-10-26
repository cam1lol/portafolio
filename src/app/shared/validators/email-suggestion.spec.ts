import { suggestEmail } from './email-suggestion';

describe('suggestEmail', () => {
  it('corrige dominios comunes mal escritos', () => {
    expect(suggestEmail('ana@gmial.com')).toBe('ana@gmail.com');
    expect(suggestEmail('ana@hotmial.com')).toBe('ana@hotmail.com');
    expect(suggestEmail('ana@outlok.com')).toBe('ana@outlook.com');
    expect(suggestEmail('ana@yaho.es')).toBe('ana@yahoo.es');
  });

  it('corrige la terminación', () => {
    expect(suggestEmail('ana@gmail.con')).toBe('ana@gmail.com');
    expect(suggestEmail('ana@gmail.co')).toBe('ana@gmail.com');
  });

  it('conserva el usuario tal como lo escribió y normaliza el dominio', () => {
    expect(suggestEmail('Ana.Perez@GMIAL.com')).toBe('Ana.Perez@gmail.com');
  });

  it('no sugiere nada si el dominio ya es correcto', () => expect(suggestEmail('ana@gmail.com')).toBeNull());
  it('no sugiere para dominios propios que no se parecen a los comunes', () => {
    expect(suggestEmail('ana@empresa.co')).toBeNull();
    expect(suggestEmail('camilo@velamentum.com')).toBeNull();
  });
  it('no sugiere con un correo incompleto', () => {
    expect(suggestEmail('ana@')).toBeNull();
    expect(suggestEmail('ana')).toBeNull();
    expect(suggestEmail('')).toBeNull();
  });
});
