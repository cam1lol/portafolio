import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';
import { ProjectTransitionService, RING_BURST_EVENT, direction, leafPath } from './project-transition.service';

/** Minimal route snapshot chain whose deepest child has `path`. */
function snapshot(path: string): ActivatedRouteSnapshot {
  return { routeConfig: null, firstChild: { routeConfig: { path }, firstChild: null } } as unknown as ActivatedRouteSnapshot;
}

function info(from: string, to: string) {
  const skipTransition = jasmine.createSpy('skipTransition');
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => (finish = resolve));
  const value = { from: snapshot(from), to: snapshot(to), transition: { skipTransition, finished } } as unknown as ViewTransitionInfo;
  return { value, skipTransition, finish };
}

describe('ProjectTransitionService', () => {
  let service: ProjectTransitionService;

  beforeEach(() => {
    service = TestBed.inject(ProjectTransitionService);
    document.documentElement.classList.remove('vt-forward', 'vt-back', 'vt-modal', 'vt-instant');
  });

  it('leafPath lee la ruta más profunda y direction compara profundidad', () => {
    expect(leafPath(snapshot('proyectos/:slug'))).toBe('proyectos/:slug');
    expect(direction('proyectos', 'proyectos/:slug')).toBe('forward');
    expect(direction('', 'proyectos/:slug')).toBe('forward');
    expect(direction('proyectos/:slug', 'proyectos')).toBe('back');
    expect(direction('proyectos/:slug', '')).toBe('back');
    expect(direction('proyectos/:slug', 'proyectos/:slug')).toBe('forward');
  });

  it('solo el proyecto activo lleva los nombres compartidos', () => {
    expect(service.name('cauce', 'title')).toBeNull();
    service.activeSlug.set('cauce');
    expect(service.name('cauce', 'title')).toBe('project-title');
    expect(service.name('cauce', 'media')).toBe('project-media');
    expect(service.name('cauce', 'card')).toBe('project-card');
    expect(service.name('velamentum', 'title')).toBeNull();
  });

  it('anima lista -> proyecto con vt-forward, avisa a los anillos y limpia al terminar', async () => {
    const burst = jasmine.createSpy('burst');
    window.addEventListener(RING_BURST_EVENT, burst);
    const { value, skipTransition, finish } = info('proyectos', 'proyectos/:slug');
    service.onRouterTransition(value);
    window.removeEventListener(RING_BURST_EVENT, burst);
    expect(skipTransition).not.toHaveBeenCalled();
    expect(document.documentElement.classList).toContain('vt-forward');
    expect(service.transitioning()).toBeTrue();
    expect(burst).toHaveBeenCalled();
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.classList).not.toContain('vt-forward');
    expect(service.transitioning()).toBeFalse();
  });

  it('volver del proyecto a la portada es vt-back', () => {
    service.onRouterTransition(info('proyectos/:slug', '').value);
    expect(document.documentElement.classList).toContain('vt-back');
  });

  it('no anima fuera de los proyectos (admin) ni entre anclas de la portada', () => {
    const admin = info('', 'dashboard');
    service.onRouterTransition(admin.value);
    expect(document.documentElement.classList).toContain('vt-instant');
    const anchors = info('', '');
    service.onRouterTransition(anchors.value);
    expect(anchors.skipTransition).not.toHaveBeenCalled(); // instant, not skipped (no dev AbortError)
  });

  it('tras el gesto de deslizar se salta una sola transición', () => {
    service.skipNextTransition();
    const first = info('proyectos/:slug', 'proyectos');
    service.onRouterTransition(first.value);
    expect(document.documentElement.classList).toContain('vt-instant');
    expect(document.documentElement.classList).not.toContain('vt-back');
    const second = info('proyectos', 'proyectos/:slug');
    service.onRouterTransition(second.value);
    expect(second.skipTransition).not.toHaveBeenCalled();
  });

  it('run() aplica el cambio aunque el navegador no tenga View Transitions', () => {
    const doc = document as unknown as { startViewTransition?: unknown };
    const original = doc.startViewTransition;
    doc.startViewTransition = undefined;
    const change = jasmine.createSpy('change');
    service.run(change);
    expect(change).toHaveBeenCalled();
    doc.startViewTransition = original;
  });
});
