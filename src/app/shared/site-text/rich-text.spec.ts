import { parseRichText } from './rich-text.component';
import { renderInlineMarkup } from './inline-markup.pipe';

describe('Texto enriquecido de los proyectos', () => {
  it('convierte títulos en negrita en tarjetas, guiones en lista y el resto en párrafos', () => {
    const blocks = parseRichText('Intro del proyecto.\n\n**Reactividad:** Signals y RxJS.\n\n**Despliegue**: AWS.\n\n- uno\n- dos\n\nCierre.');
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'cards', 'list', 'p']);
    const cards = blocks[1];
    expect(cards.kind === 'cards' && cards.cards).toEqual([{ title: 'Reactividad', text: 'Signals y RxJS.' }, { title: 'Despliegue', text: 'AWS.' }]);
    expect(blocks[2].kind === 'list' && blocks[2].items).toEqual(['uno', 'dos']);
  });

  it('pinta el código entre comillas invertidas y escapa el HTML', () => {
    expect(renderInlineMarkup('usa `signal()` y <b>')).toBe('usa <code>signal()</code> y &lt;b&gt;');
  });
});
