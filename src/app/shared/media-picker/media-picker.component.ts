import { Component, DestroyRef, computed, inject, input, isDevMode, linkedSignal, output, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Observable, Subscription, catchError, map, of, shareReplay } from 'rxjs';

const MB = 1024 * 1024;
const MANIFEST_URL = '/media/projects/manifest.json';
/** Servidor de medios local (scripts/media-server.mjs), a través del proxy de `ng serve`. No existe en producción. */
const MEDIA_API = '/__media';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type MediaKind = 'video' | 'image' | 'doc';

interface MediaFile {
  path: string;
  kind?: MediaKind;
  bytes: number;
}

/** Lo que devuelve el servidor de medios tras optimizar una subida. Los videos traen además póster, clip de hover y duración. */
export interface MediaUpload {
  path: string;
  poster?: string;
  preview?: string;
  duration?: string;
  bytesIn: number;
  bytesOut: number;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number }
  | { phase: 'optimizing' }
  | { phase: 'done'; bytesIn: number; bytesOut: number }
  | { phase: 'error'; message: string };

const KIND_TEXT: Record<MediaKind, { none: string; folder: string; accept: string; working: string }> = {
  video: { none: 'Sin video', folder: 'el video', accept: 'video/*,.mov,.mkv,.m4v', working: 'comprimiendo el video y generando póster y vista previa; puede tardar un minuto' },
  image: { none: 'Sin imagen', folder: 'la imagen', accept: 'image/*', working: 'convirtiendo a WebP' },
  doc: { none: 'Sin archivo', folder: 'el PDF', accept: 'application/pdf,.pdf', working: 'guardando el PDF' },
};

/** Una petición por carga de página, compartida por todos los selectores del formulario; las subidas la reemplazan con la lista nueva. */
let manifest$: Observable<MediaFile[] | null> | null = null;
const sharedManifest = signal<MediaFile[] | null>(null);
let health$: Observable<boolean> | null = null;

/**
 * Elige un archivo que vive en el repositorio (public/media/projects): video, imagen o PDF. La lista sale
 * de manifest.json, que genera scripts/media-manifest.mjs antes de serve y build. Con `npm start`, un
 * servidor local también acepta subidas desde el equipo y las optimiza con ffmpeg
 * (scripts/media-server.mjs); en producción el botón de subir no aparece.
 */
@Component({
  selector: 'app-media-picker',
  standalone: true,
  template: `
    <div class="mp">
      <!-- [selected] en cada opción, no [value] en el select: las opciones llegan después de cargar el manifest -->
      <select [id]="selectId()" (change)="pick($any($event.target).value)">
        <option value="" [selected]="!selected()">{{ text().none }}</option>
        @for (file of files(); track file.path) {
          <option [value]="file.path" [selected]="file.path === selected()">{{ shortPath(file.path) }} · {{ size(file.bytes) }}</option>
        }
        @if (missing()) { <option [value]="selected()" selected>{{ selected() }}</option> }
      </select>

      @if (canUpload()) {
        <div class="mp-up">
          <input #fileInput type="file" hidden [accept]="text().accept" (change)="onFile($event)" />
          @if (upload().phase === 'uploading') {
            <button type="button" class="mp-btn mono" (click)="cancel()">CANCELAR</button>
          } @else {
            <button type="button" class="mp-btn mono" (click)="fileInput.click()" [disabled]="busy() || !slugOk()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
              SUBIR DESDE EL DISPOSITIVO
            </button>
          }
          @switch (upload().phase) {
            @case ('uploading') {
              <span class="mp-status mono" role="status">SUBIENDO {{ percent() }} %</span>
              <span class="mp-bar" aria-hidden="true"><span [style.width.%]="percent()"></span></span>
            }
            @case ('optimizing') {
              <span class="mp-status mono" role="status"><span class="mp-spin" aria-hidden="true"></span>OPTIMIZANDO · {{ text().working }}</span>
            }
          }
        </div>
        @if (!slugOk()) { <span class="mp-hint">Escribe primero el slug del proyecto (paso Medios): los archivos se guardan en su carpeta.</span> }
      }

      @if (result(); as r) {
        <span class="mp-ok mono" role="status">LISTO · {{ size(r.bytesIn) }} → {{ size(r.bytesOut) }}</span>
      }
      @if (uploadError()) { <span class="mp-error mono" role="alert">{{ uploadError() }}</span> }

      @if (selected() && preview()) {
        @switch (kind()) {
          @case ('video') { <video [src]="selected()" muted loop playsinline controls preload="metadata"></video> }
          @case ('image') { <img [src]="selected()" alt="" /> }
          @case ('doc') { <a class="mp-doc mono" [href]="selected()" target="_blank" rel="noopener">ABRIR PDF</a> }
        }
      }
      @if (showHint()) {
        <span class="mp-hint">{{ hint() ? hint() + ' ' : '' }}{{ canUpload() ? 'Súbelo desde tu equipo (se optimiza solo) o copia ' + text().folder + ' en' : 'Copia ' + text().folder + ' en' }} <span class="mono">public/media/projects/</span>{{ canUpload() ? '.' : ', reinicia o vuelve a desplegar y aparecerá aquí.' }}</span>
      }
      @if (missing()) {
        <span class="mp-error mono" role="alert">Este archivo no está en public/media/projects. Elige uno de la lista o quítalo.</span>
      } @else if (heavy(); as size) {
        <span class="mp-warn mono">Pesa {{ size }} MB: más de lo recomendado ({{ recommendedMb() }} MB), tardará más en cargar.</span>
      }
      @if (loadError()) { <span class="mp-error mono" role="alert">{{ loadError() }}</span> }
    </div>
  `,
  styles: `
    .mp { display: grid; gap: 8px; min-width: 0; }
    select {
      width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r);
      background: var(--ink); color: var(--bone); font: 13px/1.5 'Space Grotesk', sans-serif;
    }
    select:focus-visible, .mp-btn:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    .mp-up { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; }
    .mp-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px;
      border: 1px dashed var(--line); border-radius: var(--r); background: transparent;
      color: var(--bone-dim); font-size: 10px; letter-spacing: .08em; cursor: pointer;
      transition: border-color .2s, color .2s;
    }
    .mp-btn svg { width: 14px; height: 14px; }
    .mp-btn:hover:not(:disabled) { border-color: var(--ember); color: var(--ember); }
    .mp-btn:disabled { opacity: .45; cursor: not-allowed; }
    .mp-status { display: inline-flex; align-items: center; gap: 8px; color: var(--bone-dim); font-size: 10px; letter-spacing: .06em; }
    .mp-bar { flex: 1 1 120px; height: 3px; overflow: hidden; border-radius: 2px; background: var(--line); }
    .mp-bar span { display: block; height: 100%; background: var(--ember); transition: width .2s; }
    .mp-spin {
      width: 12px; height: 12px; flex-shrink: 0; border: 2px solid var(--line); border-top-color: var(--ember);
      border-radius: 50%; animation: mp-spin .8s linear infinite;
    }
    video, img { display: block; width: 100%; max-height: 240px; object-fit: contain; border: 1px solid var(--line); border-radius: var(--r); background: #000; }
    .mp-doc { justify-self: start; color: var(--ember); font-size: 10px; letter-spacing: .08em; text-decoration: none; }
    .mp-doc:hover { text-decoration: underline; }
    .mp-hint { color: var(--steel); font-size: 11px; line-height: 1.5; }
    .mp-warn { color: var(--bone-dim); font-size: 10px; }
    .mp-ok { color: var(--good); font-size: 10px; letter-spacing: .06em; }
    .mp-error { color: var(--ember); font-size: 10px; }
    @keyframes mp-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .mp-spin { animation-duration: 2.4s; } .mp-bar span { transition: none; } }
  `,
})
export class MediaPickerComponent {
  private readonly http = inject(HttpClient);

  readonly value = input('');
  readonly kind = input<MediaKind>('video');
  readonly selectId = input<string | null>(null);
  readonly recommendedMb = input<number | null>(null);
  readonly hint = input('');
  /** Las listas largas (galería, pantallas) ocultan la línea repetida de "copia el archivo" y la vista previa grande. */
  readonly showHint = input(true);
  readonly preview = input(true);
  /** Carpeta del proyecto para las subidas: public/media/projects/<slug>/. */
  readonly slug = input('');
  readonly valueChange = output<string>();
  /** Tras una subida, con los archivos extra que generó el servidor (póster, clip de hover, duración). */
  readonly uploaded = output<MediaUpload>();

  protected readonly selected = linkedSignal(() => this.value());
  protected readonly loaded = computed(() => sharedManifest() !== null);
  protected readonly loadError = signal('');

  /** True si responde el servidor de medios local (solo con `npm start`). */
  protected readonly canUpload = signal(false);
  protected readonly upload = signal<UploadState>({ phase: 'idle' });
  private uploadSub: Subscription | null = null;

  protected readonly text = computed(() => KIND_TEXT[this.kind()]);
  protected readonly files = computed(() => (sharedManifest() ?? []).filter((file) => (file.kind ?? 'video') === this.kind()));
  protected readonly slugOk = computed(() => SLUG.test(this.slug()));
  protected readonly busy = computed(() => this.upload().phase === 'uploading' || this.upload().phase === 'optimizing');
  protected readonly percent = computed(() => {
    const state = this.upload();
    return state.phase === 'uploading' ? state.percent : 0;
  });
  protected readonly result = computed(() => {
    const state = this.upload();
    return state.phase === 'done' ? state : null;
  });
  protected readonly uploadError = computed(() => {
    const state = this.upload();
    return state.phase === 'error' ? state.message : '';
  });

  protected readonly missing = computed(
    () => this.loaded() && !!this.selected() && !this.files().some((f) => f.path === this.selected()),
  );

  /** Tamaño en MB si el archivo elegido supera lo recomendado; si no, null. */
  protected readonly heavy = computed(() => {
    const limit = this.recommendedMb();
    const file = this.files().find((f) => f.path === this.selected());
    return limit && file && file.bytes > limit * MB ? this.mb(file.bytes) : null;
  });

  constructor() {
    manifest$ ??= this.http.get<MediaFile[]>(MANIFEST_URL).pipe(
      catchError((err) => {
        console.error('Failed to load media manifest', err);
        manifest$ = null; // reintenta en el siguiente formulario
        return of(null);
      }),
      shareReplay(1),
    );
    manifest$.subscribe((files) => {
      if (files) {
        if (sharedManifest() === null) sharedManifest.set(files);
      } else {
        this.loadError.set('No se encontró la lista de archivos. Ejecuta npm start o npm run build para generarla.');
      }
    });

    // El servidor de medios solo existe en desarrollo local; un build de producción nunca lo consulta.
    if (isDevMode()) {
      health$ ??= this.http.get<{ ok: boolean }>(`${MEDIA_API}/health`).pipe(
        map((res) => res?.ok === true),
        catchError(() => of(false)),
        shareReplay(1),
      );
      health$.subscribe((ok) => this.canUpload.set(ok));
    }

    inject(DestroyRef).onDestroy(() => this.uploadSub?.unsubscribe());
  }

  protected pick(path: string): void {
    this.selected.set(path);
    this.valueChange.emit(path);
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // para que elegir el mismo archivo otra vez siga disparando change
    if (file) this.send(file);
  }

  protected cancel(): void {
    this.uploadSub?.unsubscribe();
    this.uploadSub = null;
    this.upload.set({ phase: 'idle' });
  }

  private send(file: File): void {
    const params = { slug: this.slug(), kind: this.kind(), name: file.name };
    this.upload.set({ phase: 'uploading', percent: 0 });
    this.uploadSub = this.http
      .post<MediaUpload & { manifest: MediaFile[] }>(`${MEDIA_API}/upload`, file, {
        params,
        // El servidor de medios rechaza las subidas sin esta cabecera (ver scripts/media-server.mjs).
        headers: { 'Content-Type': 'application/octet-stream', 'X-Media-Upload': '1' },
        reportProgress: true,
        observe: 'events',
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            this.upload.set(percent >= 100 ? { phase: 'optimizing' } : { phase: 'uploading', percent });
          } else if (event.type === HttpEventType.Response && event.body) {
            const { manifest, ...result } = event.body;
            sharedManifest.set(manifest);
            this.upload.set({ phase: 'done', bytesIn: result.bytesIn, bytesOut: result.bytesOut });
            this.pick(result.path);
            this.uploaded.emit(result);
          }
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.error ?? (err.status === 0 || err.status === 504 ? 'El servidor de medios no responde. Reinicia npm start.' : 'No se pudo subir el archivo.');
          this.upload.set({ phase: 'error', message });
        },
      });
  }

  protected shortPath(path: string): string {
    return path.replace('/media/projects/', '');
  }

  protected mb(bytes: number): string {
    return (bytes / MB).toFixed(1);
  }

  /** "10.3 MB", o "21 KB" para archivos pequeños como pósters. */
  protected size(bytes: number): string {
    return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${this.mb(bytes)} MB`;
  }
}

/** Para tests: olvida el manifest y la comprobación del servidor guardados, así cada spec empieza limpio. */
export function resetMediaManifestCache(): void {
  manifest$ = null;
  health$ = null;
  sharedManifest.set(null);
}
