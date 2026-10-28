import { formatDuration, parseDuration } from './duration-picker.component';
import { chapterGroup, itemErrorMessage, resultGroup, videoGroup } from '../projects/project-details.form';

describe('Selector de duración', () => {
  it('lee lo guardado en cualquier idioma y escribe singular y plural bien', () => {
    expect(parseDuration('3 mese')).toEqual({ amount: 3, unit: 'months' });
    expect(parseDuration('1 year')).toEqual({ amount: 1, unit: 'years' });
    expect(parseDuration('6 semanas')).toEqual({ amount: 6, unit: 'weeks' });
    expect(parseDuration('Varios')).toBeNull();
    expect(formatDuration(1, 'months', 'es')).toBe('1 mes');
    expect(formatDuration(3, 'months', 'es')).toBe('3 meses');
    expect(formatDuration(2, 'years', 'en')).toBe('2 years');
  });
});

describe('Validaciones de elementos del proyecto', () => {
  it('un resultado con texto necesita cifra y un video con título necesita archivo', () => {
    const result = resultGroup({ value: '', labelEs: 'carga', labelEn: '', contextEs: '', contextEn: '' });
    expect(itemErrorMessage(result)).toContain('cifra');
    result.controls.value.setValue('-40 %');
    expect(result.valid).toBeTrue();
    const video = videoGroup();
    expect(video.valid).withContext('vacío no molesta').toBeTrue();
    video.controls.titleEs.setValue('Recorrido');
    expect(itemErrorMessage(video)).toContain('archivo');
  });

  it('un antes y después necesita sus dos imágenes', () => {
    const chapter = chapterGroup('compare');
    expect(chapter.valid).toBeTrue();
    chapter.controls.media.setValue('/a.webp');
    expect(itemErrorMessage(chapter)).toContain('dos imágenes');
    chapter.controls.mediaAfter.setValue('/b.webp');
    expect(chapter.valid).toBeTrue();
  });
});
