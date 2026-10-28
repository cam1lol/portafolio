import { Project } from './project.model';
import { chapterHasContent, detailsFromRow, detailsToRow, emptyChapter, filterProjects, homeProjects, relatedProjects, emptyDetails } from './project-details';

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

  it('caso de estudio: se guarda dentro de facts sin pisar la ficha y se lee de vuelta', () => {
    const story = { challengeEs: 'El reto', challengeEn: 'The challenge', approachEs: 'Cómo', approachEn: '', outcomeEs: 'Qué salió', outcomeEn: '' };
    const facts = { ...emptyDetails().facts, year: '2025', client: 'Acme' };
    const row = detailsToRow({ ...emptyDetails(), facts, story });
    const stored = row['facts'] as Record<string, string>;
    expect(stored['year']).toBe('2025');
    expect(stored['challenge_es']).toBe('El reto');
    const back = detailsFromRow(row);
    expect(back.story).toEqual(story);
    expect(back.facts.client).toBe('Acme');
    // Projects saved before the story existed read an empty one.
    expect(detailsFromRow({ facts: { year: '2020' } }).story.challengeEs).toBe('');
  });

  it('presentación de historia y resultados: se guarda en facts y por defecto queda la actual', () => {
    const back = detailsFromRow(detailsToRow({ ...emptyDetails(), storyLayout: 'pinned', resultsStyle: 'rings' }));
    expect(back.storyLayout).toBe('pinned');
    expect(back.resultsStyle).toBe('rings');
    const old = detailsFromRow({ facts: { year: '2020' } });
    expect(old.storyLayout).toBe('timeline');
    expect(old.resultsStyle).toBe('numbers');
    expect(detailsFromRow({ facts: { story_layout: 'otra', results_style: 'x' } }).storyLayout).toBe('timeline');
  });

  it('puntos de interés: solo con texto, posiciones dentro de la imagen', () => {
    const hotspots = [
      { x: 12.34, y: 150, labelEs: 'Menú', labelEn: '' },
      { x: 50, y: 50, labelEs: '  ', labelEn: '' },
    ];
    const back = detailsFromRow(detailsToRow({ ...emptyDetails(), hotspots }));
    expect(back.hotspots).toEqual([{ x: 12.3, y: 100, labelEs: 'Menú', labelEn: '' }]);
    expect(detailsFromRow({ facts: {} }).hotspots).toEqual([]);
  });

  it('versión móvil: video y capturas sin vacías, máximo 6, y lee la captura única anterior', () => {
    const images = [' a.png ', '', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png', 'g.png'];
    const back = detailsFromRow(detailsToRow({ ...emptyDetails(), mobileVideo: ' m.mp4 ', mobileImages: images }));
    expect(back.mobileVideo).toBe('m.mp4');
    expect(back.mobileImages).toEqual(['a.png', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png']);
    expect(detailsFromRow({ facts: { phone_image: 'viejo.png' } }).mobileImages).toEqual(['viejo.png']);
    expect(detailsFromRow({ facts: {} }).mobileImages).toEqual([]);
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

describe('project chapters mapping', () => {
  it('lee cada tipo, descarta tipos desconocidos y normaliza el ancho', () => {
    const details = detailsFromRow({
      chapters: [
        { type: 'text', title_es: 'El reto', body_es: 'Primer párrafo' },
        { type: 'image', media: '/media/projects/x/hero.webp', layout: 'full', alt_es: 'Portada' },
        { type: 'compare', media: '/a.webp', media_after: '/b.webp', layout: 'raro' },
        { type: 'video', media: '/v.mp4' },
        'roto',
      ],
    });
    expect(details.chapters.map((ch) => ch.type)).toEqual(['text', 'image', 'compare']);
    expect(details.chapters[0]).toEqual({ ...emptyChapter('text'), titleEs: 'El reto', bodyEs: 'Primer párrafo' });
    expect(details.chapters[1].layout).toBe('full');
    expect(details.chapters[2].layout).toBe('contained');
    expect(details.chapters[2].mediaAfter).toBe('/b.webp');
    // Projects saved before chapters existed read an empty list.
    expect(detailsFromRow({}).chapters).toEqual([]);
  });

  it('guarda en snake_case, en orden, y descarta los capítulos incompletos para su tipo', () => {
    const chapters = [
      { ...emptyChapter('quote'), bodyEs: '  Una cita  ', author: 'Cliente' },
      { ...emptyChapter('compare'), media: '/a.webp' },
      { ...emptyChapter('code'), code: 'const a = 1;', language: 'ts' },
      { ...emptyChapter('model') },
      { ...emptyChapter('text') },
    ];
    expect(chapters.map(chapterHasContent)).toEqual([true, false, true, false, false]);
    const row = detailsToRow({ ...emptyDetails(), chapters });
    const stored = row['chapters'] as Record<string, string>[];
    expect(stored.map((ch) => ch['type'])).toEqual(['quote', 'code']);
    expect(stored[0]['body_es']).toBe('Una cita');
    expect(stored[1]['media_after']).toBe('');
    expect(detailsFromRow(row).chapters[1]).toEqual({ ...chapters[2] });
  });
});
