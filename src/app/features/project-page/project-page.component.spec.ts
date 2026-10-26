import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { BehaviorSubject, of } from 'rxjs';
import { ProjectPageComponent } from './project-page.component';
import { ProjectsService } from '../../core/data/projects.service';
import { Project } from '../../core/data/project.model';
import { emptyDetails } from '../../core/data/project-details';

const project = (slug: string, name: string): Project => ({
  id: slug, name, slug, type: 'web', kind: 'front', status: 'live', icon: 'box', typeLabel: 'WEB',
  summaryEs: `Resumen ${name}`, summaryEn: `Summary ${name}`, longEs: '', longEn: '',
  highlightsEs: ['Destacado'], highlightsEn: ['Highlight'], stack: ['Angular'],
  caseStudyEs: 'Así lo **construí**.', caseStudyEn: '', ...emptyDetails(),
});

describe('ProjectPageComponent', () => {
  const params = new BehaviorSubject(convertToParamMap({ slug: 'cauce' }));

  const defaultList = () => [project('velamentum', 'Velamentum'), project('cauce', 'Cauce'), project('panel', 'Panel')];

  async function render(slug: string, list: Project[] = defaultList()) {
    params.next(convertToParamMap({ slug }));
    await TestBed.configureTestingModule({
      imports: [
        ProjectPageComponent,
        TranslocoTestingModule.forRoot({ langs: { es: {}, en: {} }, translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' }, preloadLangs: true }),
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: ProjectsService, useValue: { getPublished: () => of(list) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectPageComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra el proyecto, su caso de estudio y fija el título', async () => {
    const { root } = await render('cauce');
    expect(root.querySelector('h1')?.textContent).toContain('Cauce');
    expect(root.querySelector('.case-study')?.innerHTML).toContain('<b>construí</b>');
    expect(TestBed.inject(Title).getTitle()).toContain('Cauce');
  });

  it('enlaza al proyecto anterior y al siguiente', async () => {
    const { root } = await render('cauce');
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.pager a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/proyectos/velamentum', '/proyectos/panel']);
  });

  it('sin detalles no muestra secciones vacías', async () => {
    const { root } = await render('cauce');
    for (const selector of ['.facts', '.results', '.tour', '.gallery', '.extras']) expect(root.querySelector(selector)).withContext(selector).toBeNull();
  });

  it('muestra ficha, recorrido de pantallas, documentos y relacionados', async () => {
    const cauce: Project = {
      ...project('cauce', 'Cauce'),
      facts: { ...emptyDetails().facts, year: '2025', roleEs: 'Full-stack' },
      screens: [
        { titleEs: 'Inicio', titleEn: 'Home', descEs: 'La portada', descEn: '', video: '', image: '/media/projects/cauce/home.webp' },
        { titleEs: 'Panel', titleEn: 'Dashboard', descEs: 'El panel', descEn: '', video: '/media/projects/cauce/panel.mp4', image: '' },
      ],
      docs: [{ titleEs: 'Manual', titleEn: '', file: '/media/projects/cauce/manual.pdf', url: '' }],
    };
    const blender: Project = { ...project('bosque', 'Bosque'), stack: ['Blender'] };
    const { fixture, root } = await render('cauce', [project('velamentum', 'Velamentum'), cauce, blender]);

    expect(root.querySelector('.facts')!.textContent).toContain('2025');
    expect(root.querySelector('.tour-view img')!.getAttribute('src')).toContain('home.webp');
    (root.querySelectorAll<HTMLButtonElement>('.tour-list button')[1]).click();
    fixture.detectChanges();
    expect(root.querySelector('.tour-view video')!.getAttribute('src')).toContain('panel.mp4');
    expect(root.querySelector('.tour-desc')!.textContent).toContain('El panel');
    expect(root.querySelector('.docs a')!.getAttribute('href')).toContain('manual.pdf');
    // Velamentum shares Angular; Bosque shares nothing.
    expect(Array.from(root.querySelectorAll('.related-card strong')).map((el) => el.textContent)).toEqual(['Velamentum']);
  });

  it('si el slug no existe muestra el aviso sin romperse', async () => {
    const { root } = await render('no-existe');
    expect(root.querySelector('.not-found')).not.toBeNull();
  });
});
