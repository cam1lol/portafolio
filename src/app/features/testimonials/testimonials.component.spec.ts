import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { TestimonialsComponent, initialsOf } from './testimonials.component';
import { ClientsComponent } from '../clients/clients.component';
import { CollectionRow, CollectionsService } from '../../core/data/collections.service';
import { SiteContentService } from '../../core/data/site-content.service';

function setup<T>(component: Type<T>, rows: CollectionRow[] | null) {
  TestBed.configureTestingModule({
    imports: [
      component,
      TranslocoTestingModule.forRoot({
        langs: { es: { cl_h: '// HAN CONFIADO EN MÍ', ts_h: 'TESTIMONIOS', ts_d: 'd' }, en: { cl_h: '// TRUSTED BY', ts_h: 'TESTIMONIALS', ts_d: 'd' } },
        translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
        preloadLangs: true,
      }),
    ],
    providers: [
      { provide: CollectionsService, useValue: { getPublished: () => of(rows) } },
      { provide: SiteContentService, useValue: { content: () => ({}), ensureLoaded: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement, transloco: TestBed.inject(TranslocoService) };
}

const row = (values: Record<string, string>, id = values['author'] ?? values['name']): CollectionRow =>
  ({ id, sort_order: 0, published: true, ...values }) as CollectionRow;

describe('TestimonialsComponent', () => {
  const rows = [
    row({ quote_es: 'Entregó antes de tiempo.', quote_en: 'Delivered ahead of time.', author: 'Ana María Pérez', role_es: 'Directora', role_en: 'Director', company: 'Acme', photo: '' }),
    row({ quote_es: 'Muy buen trabajo.', quote_en: '', author: 'Luis', role_es: '', role_en: '', company: '', photo: 'https://x/foto.webp' }),
  ];

  it('una tarjeta por testimonio con índice, cita, nombre y cargo', () => {
    const { root } = setup(TestimonialsComponent, rows);
    const cards = root.querySelectorAll('.card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.idx')!.textContent).toContain('01 / 02');
    expect(cards[0].querySelector('blockquote')!.textContent).toContain('Entregó antes de tiempo.');
    expect(cards[0].textContent).toContain('Directora · Acme');
    expect(cards[0].querySelector('.initials')!.textContent).toContain('AP');
    expect(cards[1].querySelector('img.avatar')!.getAttribute('src')).toContain('foto.webp');
  });

  it('en inglés usa la traducción y, si falta, la cita en español', () => {
    const { fixture, root, transloco } = setup(TestimonialsComponent, rows);
    transloco.setActiveLang('en');
    fixture.detectChanges();
    const quotes = Array.from(root.querySelectorAll('blockquote')).map((q) => q.textContent!.trim());
    expect(quotes).toEqual(['Delivered ahead of time.', 'Muy buen trabajo.']);
  });

  it('sin testimonios (o sin la tabla) no muestra la sección', () => {
    expect(setup(TestimonialsComponent, []).root.querySelector('section')).toBeNull();
    TestBed.resetTestingModule();
    expect(setup(TestimonialsComponent, null).root.querySelector('section')).toBeNull();
  });

  it('iniciales: primera y última palabra', () => {
    expect(initialsOf('María Fernanda López')).toBe('ML');
    expect(initialsOf('luis')).toBe('L');
    expect(initialsOf('  ')).toBe('');
  });
});

describe('ClientsComponent', () => {
  it('logo con enlace, o el nombre si no hay logo', () => {
    const { root } = setup(ClientsComponent, [
      row({ name: 'Velamentum', logo: 'https://x/velamentum.png', url: 'https://velamentum.co' }),
      row({ name: 'Simple', logo: '', url: '' }),
    ]);
    const items = root.querySelectorAll('.logos li');
    expect(items.length).toBe(2);
    const link = items[0].querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://velamentum.co');
    expect(link.querySelector('img')!.getAttribute('alt')).toBe('Velamentum');
    expect(items[1].querySelector('a')).toBeNull();
    expect(items[1].querySelector('.name')!.textContent).toContain('Simple');
  });

  it('sin clientes no muestra la franja', () => {
    expect(setup(ClientsComponent, []).root.querySelector('section')).toBeNull();
  });
});
