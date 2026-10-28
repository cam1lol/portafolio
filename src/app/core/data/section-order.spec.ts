import { detailsFromRow, detailsToRow, effectiveSectionOrder, emptyDetails, PAGE_SECTIONS } from './project-details';

describe('Orden de las secciones del proyecto', () => {
  it('completa un orden guardado con las secciones que falten y descarta las desconocidas', () => {
    const order = effectiveSectionOrder(['s-videos', 's-story', 'nada', 's-videos']);
    // What was saved keeps its relative order; a section it does not mention goes to its default place.
    expect(order.indexOf('s-videos')).toBeLessThan(order.indexOf('s-story'));
    expect(order[0]).toBe('s-demo');
    expect(order.length).toBe(PAGE_SECTIONS.length);
    expect(new Set(order).size).toBe(order.length);
    expect(effectiveSectionOrder([])).toEqual(PAGE_SECTIONS.map((s) => s.id));
  });

  it('se guarda dentro de facts y se lee de vuelta', () => {
    const row = detailsToRow({ ...emptyDetails(), sectionOrder: ['s-gallery', 's-story'] });
    expect((row['facts'] as Record<string, string>)['section_order']).toBe('s-gallery,s-story');
    expect(detailsFromRow(row).sectionOrder).toEqual(['s-gallery', 's-story']);
    expect(detailsFromRow({}).sectionOrder).toEqual([]);
  });
});
