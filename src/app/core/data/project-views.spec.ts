import { summarizeViews } from './project-views.service';

describe('summarizeViews (lectura por proyecto)', () => {
  it('agrupa por proyecto, calcula medias y ordena por lecturas', () => {
    const stats = summarizeViews([
      { slug: 'a', lang: 'es', depth: 100, seconds: 60 },
      { slug: 'a', lang: 'en', depth: 40, seconds: 20 },
      { slug: 'b', lang: 'es', depth: 95, seconds: 90 },
      { slug: 'a', lang: 'es', depth: 70, seconds: 40 },
    ]);
    expect(stats.map((s) => s.slug)).toEqual(['a', 'b']);
    expect(stats[0]).toEqual({ slug: 'a', views: 3, avgDepth: 70, avgSeconds: 40, readToEnd: 33, enShare: 33 });
    expect(stats[1].readToEnd).toBe(100);
    expect(summarizeViews([])).toEqual([]);
  });
});
