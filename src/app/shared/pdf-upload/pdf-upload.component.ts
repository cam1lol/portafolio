import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';

const BUCKET = 'documents';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads a PDF to the public `documents` bucket (migration 0012) and emits its public URL.
 * Used for the CV in Textos del sitio: it works from the published admin, not only locally.
 */
@Component({
  selector: 'app-pdf-upload',
  standalone: true,
  template: `
    <div class="pdf">
      @if (current()) {
        <div class="pdf-file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h4" /></svg>
          <a class="mono" [href]="current()" target="_blank" rel="noopener">{{ fileName(current()) }}</a>
        </div>
      }
      <div class="pdf-actions">
        <input #file type="file" hidden accept="application/pdf,.pdf" (change)="onFile($event)" />
        <button type="button" class="pdf-btn mono" [id]="inputId()" (click)="file.click()" [disabled]="uploading()">
          {{ uploading() ? 'SUBIENDO…' : current() ? 'REEMPLAZAR PDF' : 'SUBIR PDF' }}
        </button>
        @if (current() && !uploading()) {
          <button type="button" class="pdf-btn mono" (click)="clear()">QUITAR</button>
        }
      </div>
      @if (error()) { <span class="pdf-error mono" role="alert">{{ error() }}</span> }
    </div>
  `,
  styles: `
    .pdf { display: grid; gap: 8px; min-width: 0; }
    .pdf-file {
      display: flex; align-items: center; gap: 10px; min-width: 0; padding: 10px 12px;
      border: 1px solid var(--line); border-radius: var(--r); background: var(--ink);
    }
    .pdf-file svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--ember); }
    .pdf-file a { overflow: hidden; color: var(--bone); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .pdf-file a:hover { color: var(--ember); }
    .pdf-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .pdf-btn {
      padding: 8px 12px; border: 1px dashed var(--line); border-radius: var(--r); background: transparent;
      color: var(--bone-dim); font-size: 10px; letter-spacing: .08em; cursor: pointer; transition: border-color .2s, color .2s;
    }
    .pdf-btn:hover:not(:disabled) { border-color: var(--ember); color: var(--ember); }
    .pdf-btn:disabled { opacity: .5; cursor: progress; }
    .pdf-btn:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    .pdf-error { color: var(--ember); font-size: 10px; }
  `,
})
export class PdfUploadComponent {
  private readonly supabase = inject(SupabaseService);

  readonly value = input('');
  /** Folder inside the bucket, e.g. `cv`. */
  readonly folder = input('docs');
  /** Id for the main button, so a <label for> can point at it. */
  readonly inputId = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly current = linkedSignal(() => this.value());
  protected readonly uploading = signal(false);
  protected readonly error = signal('');

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set('');
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      this.error.set('Solo se admiten archivos PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('El PDF supera el límite de 10 MB.');
      return;
    }

    this.uploading.set(true);
    try {
      // A fresh name per upload, so browsers and the CDN never serve the previous CV from cache.
      const path = `${this.folder()}/${this.slug(file.name)}-${crypto.randomUUID().slice(0, 8)}.pdf`;
      const storage = this.supabase.client.storage.from(BUCKET);
      const { error } = await storage.upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) throw error;
      const url = storage.getPublicUrl(path).data.publicUrl;
      this.current.set(url);
      this.valueChange.emit(url);
    } catch (err) {
      console.error('Failed to upload PDF to Supabase Storage', err);
      this.error.set('No se pudo subir el PDF. Comprueba tu sesión y que la migración 0012 esté aplicada.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected clear(): void {
    this.current.set('');
    this.valueChange.emit('');
  }

  protected fileName(url: string): string {
    return decodeURIComponent(url.split('/').pop() ?? url);
  }

  private slug(name: string): string {
    const base = name
      .replace(/\.pdf$/i, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return base || 'documento';
  }
}
