import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { MediaKind, MediaPickerComponent, MediaUpload, resetMediaManifestCache } from './media-picker.component';

const MANIFEST = [
  { path: '/media/projects/cauce/clip.mp4', kind: 'video', bytes: 1.5 * 1024 * 1024 },
  { path: '/media/projects/cauce/demo.mp4', kind: 'video', bytes: 30 * 1024 * 1024 },
  { path: '/media/projects/cauce/home.webp', kind: 'image', bytes: 200 * 1024 },
  { path: '/media/projects/cauce/manual.pdf', kind: 'doc', bytes: 900 * 1024 },
];

function setup(value = '', recommendedMb: number | null = 2, kind: MediaKind = 'video', opts: { server?: boolean; slug?: string } = {}) {
  resetMediaManifestCache();
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(MediaPickerComponent);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('recommendedMb', recommendedMb);
  fixture.componentRef.setInput('kind', kind);
  fixture.componentRef.setInput('slug', opts.slug ?? 'cauce');
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/media/projects/manifest.json').flush(MANIFEST);
  const health = http.expectOne('/__media/health');
  if (opts.server) health.flush({ ok: true, ffmpeg: true });
  else health.flush('', { status: 504, statusText: 'Gateway Timeout' });
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement, http };
}

const optionTexts = (root: HTMLElement) => Array.from(root.querySelectorAll('option')).map((o) => o.textContent!.trim());

describe('MediaPickerComponent', () => {
  it('lista solo los archivos del tipo pedido, con su peso', () => {
    const { root } = setup();
    const options = optionTexts(root);
    expect(options.length).toBe(3); // "Sin video" + 2 videos
    expect(options[1]).toContain('cauce/clip.mp4');
    expect(options[1]).toContain('1.5 MB');
  });

  it('emite la ruta elegida y muestra la vista previa', () => {
    const { fixture, root } = setup();
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    const select = root.querySelector('select')!;
    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(emitted).toEqual(['/media/projects/cauce/demo.mp4']);
    expect(root.querySelector('video')!.getAttribute('src')).toBe('/media/projects/cauce/demo.mp4');
  });

  it('imágenes muestran <img>', () => {
    const image = setup('/media/projects/cauce/home.webp', null, 'image').root;
    expect(optionTexts(image)[0]).toBe('Sin imagen');
    expect(optionTexts(image)[1]).toContain('200 KB'); // small files in KB, not "0.2 MB"
    expect(image.querySelector('img')!.getAttribute('src')).toContain('home.webp');
  });

  it('los PDF muestran un enlace para abrirlo', () => {
    const doc = setup('/media/projects/cauce/manual.pdf', null, 'doc').root;
    expect(doc.querySelector('a.mp-doc')!.getAttribute('href')).toContain('manual.pdf');
  });

  it('avisa si el archivo elegido pesa más de lo recomendado', () => {
    const { root } = setup('/media/projects/cauce/demo.mp4', 25);
    expect(root.querySelector('.mp-warn')!.textContent).toContain('30.0 MB');
  });

  it('sin servidor de medios (producción) no ofrece subir', () => {
    const { root } = setup();
    expect(root.querySelector('.mp-btn')).toBeNull();
  });

  it('con el servidor local ofrece subir; sin slug el botón queda desactivado', () => {
    const withSlug = setup('', 2, 'video', { server: true }).root;
    expect(withSlug.querySelector<HTMLButtonElement>('.mp-btn')!.disabled).toBeFalse();
    expect(withSlug.querySelector('input[type=file]')!.getAttribute('accept')).toContain('video/*');
    TestBed.resetTestingModule();
    const noSlug = setup('', 2, 'video', { server: true, slug: '' }).root;
    expect(noSlug.querySelector<HTMLButtonElement>('.mp-btn')!.disabled).toBeTrue();
    expect(noSlug.textContent).toContain('Escribe primero el slug');
  });

  it('sube el archivo, muestra progreso y optimización, y selecciona el resultado', () => {
    const { fixture, root, http } = setup('', 25, 'video', { server: true });
    const values: string[] = [];
    const uploads: MediaUpload[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => values.push(v));
    fixture.componentInstance.uploaded.subscribe((u) => uploads.push(u));

    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    const file = new File(['x'.repeat(10)], 'Mi Demo.mov', { type: 'video/quicktime' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    const req = http.expectOne((r) => r.url === '/__media/upload');
    expect(req.request.params.get('slug')).toBe('cauce');
    expect(req.request.params.get('kind')).toBe('video');
    expect(req.request.params.get('name')).toBe('Mi Demo.mov');
    expect(req.request.body).toBe(file);
    expect(req.request.headers.get('X-Media-Upload')).toBe('1');

    req.event({ type: HttpEventType.UploadProgress, loaded: 4, total: 10 });
    fixture.detectChanges();
    expect(root.textContent).toContain('SUBIENDO 40 %');
    req.event({ type: HttpEventType.UploadProgress, loaded: 10, total: 10 });
    fixture.detectChanges();
    expect(root.textContent).toContain('OPTIMIZANDO');

    const result = {
      path: '/media/projects/cauce/mi-demo.mp4', poster: '/media/projects/cauce/mi-demo.poster.webp',
      preview: '/media/projects/cauce/mi-demo.preview.mp4', duration: '0:20', bytesIn: 120 * 1024 * 1024, bytesOut: 10 * 1024 * 1024,
    };
    req.flush({ ...result, manifest: [...MANIFEST, { path: result.path, kind: 'video', bytes: result.bytesOut }] });
    fixture.detectChanges();

    expect(values).toEqual([result.path]);
    expect(uploads).toEqual([result]);
    expect(root.querySelector('.mp-ok')!.textContent).toContain('120.0 MB → 10.0 MB');
    expect(optionTexts(root).some((o) => o.includes('cauce/mi-demo.mp4'))).toBeTrue();
    expect(root.querySelector('select')!.value).toBe(result.path);
  });

  it('muestra el error que devuelve el servidor', () => {
    const { fixture, root, http } = setup('', 2, 'doc', { server: true });
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'falso.pdf')] });
    input.dispatchEvent(new Event('change'));
    http.expectOne((r) => r.url === '/__media/upload').flush({ error: 'El archivo no es un PDF válido.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(root.querySelector('[role=alert]')!.textContent).toContain('no es un PDF válido');
  });

  it('marca un valor guardado que ya no está en el proyecto', () => {
    const { root } = setup('https://x.supabase.co/storage/v1/object/public/project-media/viejo.mp4');
    expect(root.querySelector('.mp-error')).not.toBeNull();
    expect(root.querySelector('select')!.value).toContain('viejo.mp4');
  });
});
