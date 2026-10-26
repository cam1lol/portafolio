import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ProjectVideosComponent } from './project-videos.component';
import { ProjectVideo } from '../../core/data/project-details';

const video = (name: string, poster = ''): ProjectVideo => ({
  titleEs: `Video ${name}`, titleEn: `Video ${name} EN`, descEs: `Descripción ${name}`, descEn: '',
  video: `/media/projects/x/${name}.mp4`, poster, preview: '', duration: '1:30',
});

async function render(videos: ProjectVideo[], lang: 'es' | 'en' = 'es') {
  await TestBed.configureTestingModule({
    imports: [ProjectVideosComponent, TranslocoTestingModule.forRoot({ langs: { es: {}, en: {} }, translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' } })],
  }).compileComponents();
  const fixture = TestBed.createComponent(ProjectVideosComponent);
  fixture.componentRef.setInput('videos', videos);
  fixture.componentRef.setInput('lang', lang);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('ProjectVideosComponent', () => {
  afterEach(() => document.querySelectorAll('app-project-videos').forEach((el) => el.remove()));

  it('una tarjeta por video, con póster y sin descargar el video hasta reproducirlo', async () => {
    const { root } = await render([video('a', '/media/projects/x/a.webp'), video('b')]);
    const cards = root.querySelectorAll('.vcard');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('img')!.getAttribute('src')).toContain('a.webp');
    expect(cards[0].querySelector('video')).toBeNull();
    // Without a poster it shows the first frame, asking only for metadata.
    const fallback = cards[1].querySelector('video')!;
    expect(fallback.getAttribute('preload')).toBe('metadata');
    expect(fallback.getAttribute('src')).toContain('b.mp4#t=0.1');
    expect(cards[0].textContent).toContain('1:30');
    expect(cards[0].textContent).toContain('Descripción a');
  });

  it('al hacer clic abre el reproductor con título, descripción y navegación', async () => {
    const { fixture, root } = await render([video('a'), video('b')]);
    (root.querySelectorAll<HTMLButtonElement>('.vcard')[0]).click();
    fixture.detectChanges();
    const dialog = root.querySelector('dialog')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('video')!.getAttribute('src')).toContain('a.mp4');
    expect(dialog.textContent).toContain('Video a');

    (dialog.querySelector('.vp-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(dialog.querySelector('video')!.getAttribute('src')).toContain('b.mp4');
    expect(dialog.textContent).toContain('2 / 2');

    (dialog.querySelector('.vp-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
  });

  it('muestra los textos en inglés cuando existen, si no en español', async () => {
    const { root } = await render([video('a')], 'en');
    expect(root.querySelector('.vcard h3')!.textContent).toContain('Video a EN');
    expect(root.querySelector('.vcard p')!.textContent).toContain('Descripción a');
  });
});
