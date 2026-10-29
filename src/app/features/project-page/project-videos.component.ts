import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProjectVideo } from '../../core/data/project-details';

/** Retraso antes de que el hover arranque la vista previa, para que pasar el ratón por la cuadrícula no cargue nada. */
const HOVER_INTENT_MS = 220;

/**
 * Videos de un proyecto: una cuadrícula de tarjetas (póster, duración, título, descripción) con vista previa
 * al pasar el ratón, y un reproductor en modal con anterior/siguiente. No se descarga nada pesado de
 * entrada: las tarjetas muestran el póster (o solo los metadatos del primer fotograma), la vista previa
 * monta un <video> solo mientras hay hover y el reproductor pide metadatos hasta que se reproduce.
 */
@Component({
  selector: 'app-project-videos',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './project-videos.component.html',
  styleUrl: './project-videos.component.css',
})
export class ProjectVideosComponent {
  readonly videos = input.required<ProjectVideo[]>();
  readonly lang = input<'es' | 'en'>('es');

  private readonly player = viewChild<ElementRef<HTMLDialogElement>>('player');
  private readonly playerVideo = viewChild<ElementRef<HTMLVideoElement>>('playerVideo');

  protected readonly isOpen = signal(false);
  protected readonly current = signal(0);
  protected readonly active = computed(() => this.videos()[this.current()] ?? null);
  /** True entre "waiting" y "playing", para mostrar el anillo de carga sobre el reproductor. */
  protected readonly buffering = signal(false);
  /** Tarjeta en vista previa por hover (solo punteros precisos, nunca con movimiento reducido). */
  protected readonly previewing = signal<number | null>(null);

  private readonly canPreview =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;

  protected loc(es: string, en: string): string {
    return (this.lang() === 'en' ? en || es : es).trim();
  }

  protected startPreview(index: number): void {
    if (!this.canPreview) return;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => this.previewing.set(index), HOVER_INTENT_MS);
  }

  /**
   * La *propiedad* muted (no el atributo que pondría Angular) es lo que deja al navegador reproducir solo,
   * así la vista previa empieza aquí en cuanto tiene datos.
   */
  protected playPreview(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.muted = true;
    video.play().catch(() => undefined);
  }

  protected stopPreview(): void {
    clearTimeout(this.hoverTimer);
    this.previewing.set(null);
  }

  protected open(index: number): void {
    this.stopPreview();
    this.current.set(index);
    this.buffering.set(true);
    this.isOpen.set(true);
    this.player()?.nativeElement.showModal();
  }

  /** Primer fotograma listo: empieza a reproducir (el clic cuenta como permiso); si se bloquea, queda el botón de play. */
  protected onPlayerReady(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.buffering.set(false);
    video.play().catch(() => this.buffering.set(false));
  }

  protected close(): void {
    this.player()?.nativeElement.close();
  }

  /** Cierre nativo (Esc, botón, fondo): corta el sonido. */
  protected onClosed(): void {
    this.playerVideo()?.nativeElement.pause();
    this.buffering.set(false);
    this.isOpen.set(false);
  }

  protected step(delta: number): void {
    const count = this.videos().length;
    if (count < 2) return;
    this.current.update((index) => (index + delta + count) % count);
    this.buffering.set(true);
  }

  protected onKey(event: KeyboardEvent): void {
    // Las flechas cambian de video salvo que el foco esté en el reproductor (donde adelantan o retroceden).
    if ((event.target as HTMLElement).tagName === 'VIDEO') return;
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }
}
