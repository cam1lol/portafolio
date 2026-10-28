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
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable(), queryParamMap: of(convertToParamMap({})) } },
        { provide: ProjectsService, useValue: { getPublished: () => of(list) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProjectPageComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra el proyecto, su caso de estudio y fija el título', async () => {
    const { root } = await render('cauce');
    // Accessible name of the title (its decode effect shows glyphs for a moment).
    const h1 = root.querySelector('h1')!;
    expect(h1.getAttribute('aria-label') ?? h1.textContent).toContain('Cauce');
    expect(root.querySelector('#s-how app-rich-text')?.innerHTML).toContain('<b>construí</b>');
    expect(TestBed.inject(Title).getTitle()).toContain('Cauce');
  });

  it('enlaza al proyecto anterior y al siguiente', async () => {
    const { root } = await render('cauce');
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.pager a, a.next-band')).map((a) => a.getAttribute('href'));
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

  it('con pantalla fija y anillos: historia fija y anillo solo para porcentajes o 0-100', async () => {
    const cauce: Project = {
      ...project('cauce', 'Cauce'),
      storyLayout: 'pinned',
      resultsStyle: 'rings',
      story: { ...emptyDetails().story, challengeEs: 'El reto' },
      results: [
        { value: '-40 %', labelEs: 'Carga', labelEn: '', contextEs: '', contextEn: '' },
        { value: '3x', labelEs: 'Velocidad', labelEn: '', contextEs: '', contextEn: '' },
        { value: '250', labelEs: 'Usuarios', labelEn: '', contextEs: '', contextEn: '' },
      ],
    };
    const { root } = await render('cauce', [cauce]);
    expect(root.querySelector('#s-story app-project-story-pinned')).not.toBeNull();
    expect(root.querySelectorAll('#s-results .ring').length).toBe(1);
    expect((root.querySelector('#s-results .ring') as HTMLElement).style.getPropertyValue('--r1')).toBe('144deg');
  });

  it('escritorio y móvil: las dos versiones, el resto de capturas en fila y puntos de interés', async () => {
    const hotspots = [{ x: 20, y: 30, labelEs: 'Menú por roles', labelEn: '' }];
    const full: Project = { ...project('cauce', 'Cauce'), previewImage: 'd.png', mobileImages: ['m1.png', 'm2.png', 'm3.png'], hotspots };
    const { root } = await render('cauce', [full]);
    expect(root.querySelector('#s-devices .desk')).not.toBeNull();
    expect(root.querySelector('#s-devices .phone img')?.getAttribute('src')).toBe('m1.png');
    expect(root.querySelectorAll('#s-devices .row img').length).toBe(2);
    expect(root.querySelectorAll('#s-hotspots .spot').length).toBe(1);
    expect((root.querySelector('#s-hotspots .spot') as HTMLElement).style.left).toBe('20%');
  });

  it('solo versión móvil: el teléfono solo con su video; sin imagen de escritorio no hay puntos', async () => {
    const hotspots = [{ x: 20, y: 30, labelEs: 'Menú por roles', labelEn: '' }];
    const mobile: Project = { ...project('cauce', 'Cauce'), mobileVideo: 'm.mp4', mobileImages: ['m1.png'], hotspots };
    const { root } = await render('cauce', [mobile]);
    expect(root.querySelector('#s-devices .stage.solo')).not.toBeNull();
    expect(root.querySelector('#s-devices .desk')).toBeNull();
    expect(root.querySelector('#s-devices .phone video')?.getAttribute('src')).toBe('m.mp4');
    expect(root.querySelectorAll('#s-devices .row img').length).toBe(1);
    expect(root.querySelector('#s-hotspots')).toBeNull();
  });

  it('sin versión móvil no aparece la sección', async () => {
    const { root } = await render('cauce', [{ ...project('cauce', 'Cauce'), previewImage: 'd.png' }]);
    expect(root.querySelector('#s-devices')).toBeNull();
  });
});
