import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { rank } from './form-suggestions.service';
import { containsControl, translationPairs } from './translator.service';
import { detailsFromRow, detailsToRow, emptyDetails } from '../../../core/data/project-details';

describe('Sugerencias del formulario', () => {
  it('quita duplicados sin importar mayúsculas y ordena por uso', () => {
    expect(rank(['Angular', 'angular', 'Supabase', ' ', 'Angular', 'Three.js', 'supabase'])).toEqual(['Angular', 'Supabase', 'Three.js']);
  });
});

describe('Pares español/inglés para traducir', () => {
  it('encuentra los pares xxxEs/xxxEn en grupos y listas, y sabe a qué control pertenecen', () => {
    const results = new FormArray([new FormGroup({ value: new FormControl('-40 %'), labelEs: new FormControl('carga'), labelEn: new FormControl('') })]);
    const form = new FormGroup({ summaryEs: new FormControl('Hola'), summaryEn: new FormControl(''), name: new FormControl('X'), results });
    const pairs = translationPairs(form);
    expect(pairs.length).toBe(2);
    expect(pairs.map((p) => p.es.value)).toEqual(['Hola', 'carga']);
    expect(containsControl(results, pairs[1].es)).toBeTrue();
    expect(containsControl(results, pairs[0].es)).toBeFalse();
  });
});

describe('Punto de enfoque de la imagen', () => {
  it('se guarda dentro de facts sin aparecer en la ficha y descarta valores no permitidos', () => {
    const row = detailsToRow({ ...emptyDetails(), mediaFocus: '50% 0%' });
    expect((row['facts'] as Record<string, string>)['media_focus']).toBe('50% 0%');
    const back = detailsFromRow(row);
    expect(back.mediaFocus).toBe('50% 0%');
    expect(Object.values(back.facts).some(Boolean)).toBeFalse();
    expect(detailsFromRow({ facts: { media_focus: 'url(x)' } }).mediaFocus).toBe('50% 50%');
  });
});
