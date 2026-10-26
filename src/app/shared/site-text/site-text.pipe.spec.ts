import { TestBed } from '@angular/core/testing';
import { TRANSLOCO_MISSING_HANDLER, TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { SiteTextPipe } from './site-text.pipe';
import { SiteContentService } from '../../core/data/site-content.service';

describe('SiteTextPipe', () => {
  let pipe: SiteTextPipe;
  let missingHandler: jasmine.Spy;
  let siteContent: { content: jasmine.Spy; ensureLoaded: jasmine.Spy };

  beforeEach(() => {
    missingHandler = jasmine.createSpy('missingHandler').and.callFake((key: string) => key);
    siteContent = { content: jasmine.createSpy('content').and.returnValue({}), ensureLoaded: jasmine.createSpy('ensureLoaded') };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: { ct_b: 'correo@i18n.com' }, en: { ct_b: 'mail@i18n.com' } },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [
        { provide: SiteContentService, useValue: siteContent },
        // Any lookup of a key that i18n does not have would reach this handler (and log in dev).
        { provide: TRANSLOCO_MISSING_HANDLER, useValue: { handle: missingHandler } },
      ],
    });
    TestBed.inject(TranslocoService);
    pipe = TestBed.runInInjectionContext(() => new SiteTextPipe());
  });

  it('usa el valor de Supabase cuando existe', () => {
    siteContent.content.and.returnValue({ contact_email: { es: 'a@b.co', en: 'a@b.co' } });
    expect(pipe.transform('contact_email')).toBe('a@b.co');
  });

  it('usa el i18n cuando Supabase no tiene la clave', () => {
    expect(pipe.transform('ct_b')).toBe('correo@i18n.com');
  });

  it('una clave sin Supabase ni i18n devuelve el respaldo sin pasar por el aviso de clave faltante', () => {
    expect(pipe.transform('contact_email', 'respaldo@x.co')).toBe('respaldo@x.co');
    expect(missingHandler).not.toHaveBeenCalled();
  });
});
