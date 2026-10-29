import { Project } from '../../../core/data/project.model';
import { emptyDetails } from '../../../core/data/project-details';
import { projectGaps } from './project-gaps';

const base = (over: Partial<Project> = {}): Project => ({
  id: 'x', name: 'X', slug: 'x', type: 'web', kind: 'front', status: 'live', icon: 'box', typeLabel: 'WEB',
  summaryEs: '', summaryEn: '', longEs: '', longEn: '', highlightsEs: [], highlightsEn: [], stack: [],
  caseStudyEs: '', caseStudyEn: '', ...emptyDetails(), ...over,
});

const complete = (): Project =>
  base({
    previewImage: '/p.webp',
    liveUrl: 'https://x.dev',
    summaryEs: 'Resumen',
    summaryEn: 'Summary',
    highlightsEs: ['Rápido'],
    highlightsEn: ['Fast'],
    story: { ...emptyDetails().story, challengeEs: 'Reto', challengeEn: 'Challenge' },
    facts: { ...emptyDetails().facts, year: '2025', roleEs: 'Full-stack', roleEn: 'Full-stack' },
    results: [{ value: '-40 %', labelEs: 'Carga', labelEn: 'Load', contextEs: '', contextEn: '' }],
  });

describe('projectGaps', () => {
  it('un proyecto vacío: todo lo esencial falta, cada cosa con su paso', () => {
    expect(projectGaps(base()).map((g) => `${g.id}:${g.step}`)).toEqual([
      'cover:step-card',
      'links:step-card',
      'summary:step-story',
      'story:step-story',
      'facts:step-facts',
      'results:step-facts',
    ]);
  });

  it('un proyecto completo no tiene pendientes', () => {
    expect(projectGaps(complete())).toEqual([]);
  });

  it('cuenta los textos sin inglés por paso, incluidos los puntos destacados', () => {
    const p = complete();
    const gaps = projectGaps({
      ...p,
      longEs: 'Larga',
      highlightsEs: ['Uno', 'Dos'],
      results: [{ ...p.results[0], labelEn: '', contextEs: 'Antes 5 s' }],
    });
    expect(gaps.map((g) => g.label)).toEqual(['Falta inglés en Historia (2)', 'Falta inglés en Ficha y cifras (2)']);
  });

  it('el caso de estudio cuenta como historia y un clip como portada', () => {
    const gaps = projectGaps(base({ previewVideo: '/c.mp4', caseStudyEs: 'Así lo hice' }));
    expect(gaps.some((g) => g.id === 'cover' || g.id === 'story')).toBeFalse();
  });
});
