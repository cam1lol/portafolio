import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ProjectVideo } from '../../core/data/project-details';

/** Delay before a hover starts the preview, so sweeping the mouse across the grid loads nothing. */
const HOVER_INTENT_MS = 220;

/**
 * Videos of a project: a grid of cards (poster, duration, title, description) that preview on
 * hover, and a modal player with previous/next. Nothing heavy is downloaded up front: cards show
 * the poster (or only the first frame's metadata), the hover preview mounts a <video> only while
 * hovered, and the player asks for metadata until it plays.
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
  /** True between "waiting" and "playing", to show the loading ring over the player. */
  protected readonly buffering = signal(false);
  /** Card being previewed on hover (fine pointers only, never with reduced motion). */
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
   * The muted *property* (not the attribute Angular would set) is what lets the browser autoplay,
   * so the preview starts here once it has data.
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

  /** First frame ready: start playing (the click counts as permission); if blocked, leave the play button. */
  protected onPlayerReady(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.buffering.set(false);
    video.play().catch(() => this.buffering.set(false));
  }

  protected close(): void {
    this.player()?.nativeElement.close();
  }

  /** Native close (Esc, button, backdrop): stop the sound. */
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
    // Arrows switch videos unless the focus is on the player (where they seek).
    if ((event.target as HTMLElement).tagName === 'VIDEO') return;
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }
}
