import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { ServicesComponent } from './services.component';
import { CollectionsService } from '../../core/data/collections.service';
import { OPEN_CONTACT_EVENT, OpenContactDetail } from '../../core/data/contact.service';

describe('ServicesComponent', () => {
  const row = (over: Record<string, string>) => ({
    id: over['title_es'], title_es: '', title_en: '', description_es: '', description_en: '', price_es: '', price_en: '', ...over,
  });

  async function render(rows: Record<string, unknown>[]) {
    await TestBed.configureTestingModule({
      imports: [
        ServicesComponent,
        TranslocoTestingModule.forRoot({ langs: { es: {}, en: {} }, translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' }, preloadLangs: true }),
      ],
      providers: [{ provide: CollectionsService, useValue: { getPublished: () => of(rows) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ServicesComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('ficha: plazo e "incluye" solo si tienen texto, un punto por línea', async () => {
    const root = await render([
      row({ title_es: 'WEB APPS', timeline_es: '2 A 6 SEMANAS', includes_es: 'Diseño\n\n  Despliegue  ' }),
      row({ title_es: 'DESIGN SYSTEMS' }),
    ]);
    const [full, bare] = Array.from(root.querySelectorAll('.s'));
    expect(full.querySelector('.eta')?.textContent).toContain('2 A 6 SEMANAS');
    expect(Array.from(full.querySelectorAll('.inc li')).map((li) => li.textContent)).toEqual(['Diseño', 'Despliegue']);
    expect(bare.querySelector('.eta')).toBeNull();
    expect(bare.querySelector('.inc')).toBeNull();
  });

  it('"Cotizar esto" abre el contacto con el servicio', async () => {
    const root = await render([row({ title_es: 'WEB APPS' })]);
    const anchor = document.createElement('div');
    anchor.id = 'contact';
    document.body.appendChild(anchor);
    let detail: OpenContactDetail | undefined;
    const listener = (event: Event) => (detail = (event as CustomEvent<OpenContactDetail>).detail);
    window.addEventListener(OPEN_CONTACT_EVENT, listener);
    root.querySelector<HTMLButtonElement>('.quote')!.click();
    window.removeEventListener(OPEN_CONTACT_EVENT, listener);
    anchor.remove();
    expect(detail?.service).toBe('WEB APPS');
  });
});
