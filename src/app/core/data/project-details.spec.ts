import { Project } from './project.model';
import { detailsFromRow, detailsToRow, filterProjects, homeProjects, relatedProjects, emptyDetails } from './project-details';

const base = (over: Partial<Project>): Project => ({
  id: 'x', name: 'X', slug: 'x', type: 'web', kind: 'front', status: 'live', icon: 'box', typeLabel: 'WEB',
  summaryEs: '', summaryEn: '', longEs: '', longEn: '', highlightsEs: [], highlightsEn: [], stack: [],
  caseStudyEs: '', caseStudyEn: '', ...emptyDetails(), ...over,
});

describe('project details mapping', () => {
  it('lee el jsonb en snake_case y tolera columnas vacías o mal formadas', () => {
    const details = detailsFromRow({
      featured: true,
      facts: { year: '2025', role_es: 'Full-stack', role_en: 'Full-stack', client: 'Velamentum' },
      screens: [{ title_es: 'Inicio', title_en: 'Home', video: '/media/projects/x/home.mp4' }],
      gallery: null,
      results: 'roto',
      improvements: [{ text_es: 'Modo offline', status: 'raro' }],
    });
    expect(details.featured).toBeTrue();
    expect(details.facts.year).toBe('2025');
    expect(details.facts.client).toBe('Velamentum');
    expect(details.facts.durationEs).toBe('');
    expect(details.screens[0]).toEqual(jasmine.objectContaining({ titleEs: 'Inicio', titleEn: 'Home', video: '/media/projects/x/home.mp4', image: '' }));
    expect(details.gallery).toEqual([]);
    expect(details.results).toEqual([]);
    expect(details.improvements[0].status).toBe('planned');
  });

  it('videos: lee y escribe título, descripción, archivo, póster, vista previa y duración; descarta los que no tienen archivo', () => {
    const details = detailsFromRow({ videos: [{ title_es: 'Recorrido', title_en: 'Tour', desc_es: 'Todo el flujo', video: '/media/projects/x/tour.mp4', poster: '/media/projects/x/tour.webp', preview: '/media/projects/x/tour.preview.mp4', duration: '2:15' }] });
    expect(details.videos[0]).toEqual({ titleEs: 'Recorrido', titleEn: 'Tour', descEs: 'Todo el flujo', descEn: '', video: '/media/projects/x/tour.mp4', poster: '/media/projects/x/tour.webp', preview: '/media/projects/x/tour.preview.mp4', duration: '2:15' });
    // Videos saved before the hover clip existed still read fine.
    expect(detailsFromRow({ videos: [{ video: '/media/projects/x/old.mp4' }] }).videos[0].preview).toBe('');
    const row = detailsToRow({ ...emptyDetails(), videos: [details.videos[0], { ...details.videos[0], video: '' }] });
    expect((row['videos'] as unknown[]).length).toBe(1);
    expect(row['videos']).toEqual([{ title_es: 'Recorrido', title_en: 'Tour', desc_es: 'Todo el flujo', desc_en: '', video: '/media/projects/x/tour.mp4', poster: '/media/projects/x/tour.webp', preview: '/media/projects/x/tour.preview.mp4', duration: '2:15' }]);
  });

  it('escribe de vuelta en snake_case y descarta elementos vacíos', () => {
    const row = detailsToRow({
      ...emptyDetails(),
      screens: [
        { titleEs: 'Inicio', titleEn: '', descEs: '', descEn: '', video: '/v.mp4', image: '' },
        { titleEs: '', titleEn: '', descEs: '', descEn: '', video: '', image: '' },
      ],
      docs: [{ titleEs: 'Manual', titleEn: 'Manual', file: '', url: 'https://notion.so/x' }],
    });
    expect(row['screens']).toEqual([{ title_es: 'Inicio', title_en: '', desc_es: '', desc_en: '', video: '/v.mp4', image: '' }]);
    expect(row['docs']).toEqual([{ title_es: 'Manual', title_en: 'Manual', file: '', url: 'https://notion.so/x' }]);
    expect(row['featured']).toBeFalse();
  });
});

describe('project lists', () => {
  const a = base({ id: 'a', slug: 'a', stack: ['Angular', 'Supabase', 'Three.js'] });
  const b = base({ id: 'b', slug: 'b', stack: ['angular', 'Supabase'], type: '3d', status: 'wip', name: 'Bosque' });
  const c = base({ id: 'c', slug: 'c', stack: ['Blender'] });
  const d = base({ id: 'd', slug: 'd', stack: ['Three.js'], featured: true });

  it('relacionados: por tecnologías en común, sin el propio ni los que no comparten nada', () => {
    expect(relatedProjects(a, [a, b, c, d]).map((p) => p.id)).toEqual(['b', 'd']);
  });

  it('portada: solo destacados, o todos si no hay ninguno', () => {
    expect(homeProjects([a, b, d]).map((p) => p.id)).toEqual(['d']);
    expect(homeProjects([a, b]).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('filtra por tipo, estado, tecnología y texto', () => {
    const all = [a, b, c, d];
    expect(filterProjects(all, { type: '3d' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProjects(all, { status: 'wip' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProjects(all, { tech: 'three.js' }).map((p) => p.id)).toEqual(['a', 'd']);
    expect(filterProjects(all, { query: 'bosq' }).map((p) => p.id)).toEqual(['b']);
  });
});
