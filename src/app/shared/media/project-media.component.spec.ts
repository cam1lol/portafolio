import { TestBed } from '@angular/core/testing';
import { ProjectMediaComponent, hasProjectMedia } from './project-media.component';
import { Project } from '../../core/data/project.model';
import { emptyDetails } from '../../core/data/project-details';

const base: Project = {
  id: 'p', name: 'Cauce', slug: 'cauce', type: 'web', kind: 'front', status: 'live', icon: 'box', typeLabel: 'WEB',
  summaryEs: '', summaryEn: '', longEs: '', longEn: '', highlightsEs: [], highlightsEn: [], stack: [], caseStudyEs: '', caseStudyEn: '', ...emptyDetails(),
};

function render(project: Project) {
  const fixture = TestBed.createComponent(ProjectMediaComponent);
  fixture.componentRef.setInput('project', project);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProjectMediaComponent', () => {
  it('el demo del proyecto usa el reproductor nativo y no descarga nada hasta pulsar play', () => {
    const root = render({ ...base, demoVideoUrl: '/media/projects/cauce/demo.mp4', previewImage: 'https://x/poster.jpg' });
    const video = root.querySelector('video')!;
    expect(video.getAttribute('src')).toContain('demo.mp4');
    expect(video.controls).toBeTrue();
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('poster')).toBe('https://x/poster.jpg');
    expect(root.querySelector('iframe')).toBeNull();
  });

  it('sin póster pide solo los metadatos para mostrar el primer fotograma', () => {
    const root = render({ ...base, demoVideoUrl: 'https://x/demo.mp4' });
    expect(root.querySelector('video')!.getAttribute('preload')).toBe('metadata');
  });

  it('sin demo cae al clip y luego a la imagen', () => {
    expect(render({ ...base, previewVideo: 'https://x/clip.mp4' }).querySelector('video')!.getAttribute('src')).toContain('clip.mp4');
    expect(render({ ...base, previewImage: 'https://x/img.jpg' }).querySelector('img')!.getAttribute('src')).toContain('img.jpg');
  });

  it('hasProjectMedia detecta cualquiera de los tres', () => {
    expect(hasProjectMedia(base)).toBeFalse();
    expect(hasProjectMedia({ ...base, demoVideoUrl: 'https://x/demo.mp4' })).toBeTrue();
  });
});
