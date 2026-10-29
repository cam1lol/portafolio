import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { NotFoundComponent } from './not-found.component';
import { ProjectsService } from '../../core/data/projects.service';
import { OPEN_PALETTE_EVENT } from '../../shared/command-palette/command-palette.component';

describe('NotFoundComponent', () => {
  async function render(url: string) {
    await TestBed.configureTestingModule({
      imports: [
        NotFoundComponent,
        TranslocoTestingModule.forRoot({ langs: { es: {}, en: {} }, translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' }, preloadLangs: true }),
      ],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: { getPublished: () => of([{ slug: 'gestion-empresarial', name: 'Gestión empresarial' }]) } },
      ],
    }).compileComponents();
    spyOnProperty(TestBed.inject(Router), 'url').and.returnValue(url);
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra la ruta pedida y sugiere el proyecto con una errata', async () => {
    const root = await render('/proyectos/gestion-empresarail?x=1');
    expect(root.querySelector('.path code')?.textContent).toBe('/proyectos/gestion-empresarail');
    expect(Array.from(root.querySelectorAll('.maybe a')).map((a) => a.getAttribute('href'))).toEqual(['/proyectos/gestion-empresarial']);
  });

  it('sin parecido no sugiere nada y el botón de buscar abre la paleta', async () => {
    const root = await render('/zzzzzzzz');
    expect(root.querySelector('.maybe')).toBeNull();
    const spy = jasmine.createSpy('open');
    window.addEventListener(OPEN_PALETTE_EVENT, spy);
    root.querySelector<HTMLButtonElement>('.btn.ghost')!.click();
    window.removeEventListener(OPEN_PALETTE_EVENT, spy);
    expect(spy).toHaveBeenCalled();
  });
});
