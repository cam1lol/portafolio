import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { AvailabilityComponent } from './availability.component';
import { CvButtonComponent } from '../cv-button/cv-button.component';
import { SiteContentService, SiteContentValue } from '../../core/data/site-content.service';

/** SiteContentService without Supabase: the real valueFor() over a writable content signal. */
function fakeContent(initial: Record<string, SiteContentValue>) {
  const fake = { content: signal(initial), ensureLoaded: () => undefined, valueFor: SiteContentService.prototype.valueFor };
  return fake;
}

function setup<T>(component: Type<T>, content: Record<string, SiteContentValue>) {
  const fake = fakeContent(content);
  TestBed.configureTestingModule({
    imports: [
      component,
      TranslocoTestingModule.forRoot({
        langs: { es: { cta2: 'DESCARGAR CV' }, en: { cta2: 'DOWNLOAD CV' } },
        translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
        preloadLangs: true,
      }),
    ],
    providers: [{ provide: SiteContentService, useValue: fake }],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement, fake, transloco: TestBed.inject(TranslocoService) };
}

describe('AvailabilityComponent', () => {
  it('muestra el texto con el estado como atributo', () => {
    const { root } = setup(AvailabilityComponent, {
      availability_state: { es: 'open', en: 'open' },
      availability_text: { es: 'Disponible desde noviembre', en: 'Available from November' },
    });
    const pill = root.querySelector('.avail')!;
    expect(pill.getAttribute('data-state')).toBe('open');
    expect(pill.textContent).toContain('Disponible desde noviembre');
  });

  it('cambia al inglés y usa el español si falta la traducción', () => {
    const { fixture, root, fake, transloco } = setup(AvailabilityComponent, {
      availability_state: { es: 'limited', en: 'limited' },
      availability_text: { es: 'Agenda limitada', en: 'Limited availability' },
    });
    transloco.setActiveLang('en');
    fixture.detectChanges();
    expect(root.textContent).toContain('Limited availability');
    fake.content.set({ availability_state: { es: 'limited', en: 'limited' }, availability_text: { es: 'Agenda limitada', en: '' } });
    fixture.detectChanges();
    expect(root.textContent).toContain('Agenda limitada');
  });

  it('no se muestra si el estado es "hidden", no es válido o no hay texto', () => {
    expect(setup(AvailabilityComponent, { availability_state: { es: 'hidden', en: 'hidden' }, availability_text: { es: 'x', en: 'x' } }).root.querySelector('.avail')).toBeNull();
    TestBed.resetTestingModule();
    expect(setup(AvailabilityComponent, { availability_state: { es: 'open', en: 'open' } }).root.querySelector('.avail')).toBeNull();
    TestBed.resetTestingModule();
    expect(setup(AvailabilityComponent, {}).root.querySelector('.avail')).toBeNull();
  });
});

describe('CvButtonComponent', () => {
  const cv = { cv_url: { es: 'https://x.supabase.co/storage/v1/object/public/documents/cv/es.pdf', en: 'https://x.supabase.co/storage/v1/object/public/documents/cv/en.pdf' } };

  it('enlaza el PDF del idioma activo', () => {
    const { fixture, root, transloco } = setup(CvButtonComponent, cv);
    const link = root.querySelector('a')!;
    expect(link.getAttribute('href')).toContain('cv/es.pdf');
    expect(link.textContent).toContain('DESCARGAR CV');
    transloco.setActiveLang('en');
    fixture.detectChanges();
    expect(root.querySelector('a')!.getAttribute('href')).toContain('cv/en.pdf');
  });

  it('en inglés sin PDF propio usa el español', () => {
    const { fixture, root, transloco } = setup(CvButtonComponent, { cv_url: { es: cv.cv_url.es, en: '' } });
    transloco.setActiveLang('en');
    fixture.detectChanges();
    expect(root.querySelector('a')!.getAttribute('href')).toContain('cv/es.pdf');
  });

  it('sin PDF no muestra el botón', () => {
    expect(setup(CvButtonComponent, {}).root.querySelector('a')).toBeNull();
  });
});
