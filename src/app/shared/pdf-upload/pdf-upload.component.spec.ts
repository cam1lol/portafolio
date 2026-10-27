import { TestBed } from '@angular/core/testing';
import { PdfUploadComponent } from './pdf-upload.component';
import { SupabaseService } from '../../core/supabase/supabase.service';

function setup(value = '') {
  const upload = jasmine.createSpy('upload').and.resolveTo({ error: null });
  const getPublicUrl = jasmine.createSpy('getPublicUrl').and.callFake((path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/documents/${path}` } }));
  const from = jasmine.createSpy('from').and.returnValue({ upload, getPublicUrl });
  TestBed.configureTestingModule({
    imports: [PdfUploadComponent],
    providers: [{ provide: SupabaseService, useValue: { client: { storage: { from } } } }],
  });
  const fixture = TestBed.createComponent(PdfUploadComponent);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('folder', 'cv');
  fixture.detectChanges();
  const emitted: string[] = [];
  fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
  return { fixture, root: fixture.nativeElement as HTMLElement, upload, from, emitted };
}

async function choose(fixture: ReturnType<typeof setup>['fixture'], file: File) {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('PdfUploadComponent', () => {
  it('sube el PDF al bucket documents y emite la URL pública', async () => {
    const { fixture, root, upload, from, emitted } = setup();
    await choose(fixture, new File(['%PDF-1.4'], 'Hoja de Vida Camilo.pdf', { type: 'application/pdf' }));
    expect(from).toHaveBeenCalledWith('documents');
    const [path, , options] = upload.calls.mostRecent().args;
    expect(path).toMatch(/^cv\/hoja-de-vida-camilo-[0-9a-f]{8}\.pdf$/);
    expect(options.contentType).toBe('application/pdf');
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toContain('/documents/cv/hoja-de-vida-camilo-');
    expect(root.querySelector('.pdf-file a')!.getAttribute('href')).toBe(emitted[0]);
    expect(root.textContent).toContain('REEMPLAZAR PDF');
  });

  it('rechaza archivos que no son PDF o pesan más de 10 MB', async () => {
    const { fixture, root, upload, emitted } = setup();
    await choose(fixture, new File(['x'], 'foto.png', { type: 'image/png' }));
    expect(root.querySelector('.pdf-error')!.textContent).toContain('Solo se admiten archivos PDF');
    const big = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await choose(fixture, big);
    expect(root.querySelector('.pdf-error')!.textContent).toContain('10 MB');
    expect(upload).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('QUITAR deja el valor vacío', () => {
    const { fixture, root, emitted } = setup('https://x/documents/cv/es.pdf');
    const remove = Array.from(root.querySelectorAll('button')).find((b) => b.textContent!.includes('QUITAR'))!;
    remove.click();
    fixture.detectChanges();
    expect(emitted).toEqual(['']);
    expect(root.querySelector('.pdf-file')).toBeNull();
  });
});
