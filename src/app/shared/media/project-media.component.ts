import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { Project } from '../../core/data/project.model';

/** True when the project has something real to show (demo video, clip or image). */
export function hasProjectMedia(project: Project): boolean {
  return !!(project.demoVideoUrl || project.previewVideo || project.previewImage);
}

/** True when the project has a still or a looping clip (what a card or a hero shows). */
export function hasProjectVisual(project: Project): boolean {
  return !!(project.previewVideo || project.previewImage);
}

/**
 * Project media, best first: the full demo (a file in public/media/projects, native player that downloads
 * nothing until play), then the looping preview clip, then the still image.
 * - `auto` (default, the modal): that order.
 * - `visual` (project page hero): only the clip or the image, never the demo.
 * - `demo` (project page DEMO block): only the demo, with its poster and a large play button.
 */
@Component({
  selector: 'app-project-media',
  standalone: true,
  template: `
    @if (showDemo()) {
      <video #demo [src]="project().demoVideoUrl" [attr.poster]="project().previewImage || null"
        [attr.preload]="project().previewImage ? 'none' : 'metadata'" [controls]="playing() || mode() === 'auto'" playsinline
        (play)="playing.set(true)" [attr.aria-label]="'Demo: ' + project().name"></video>
      @if (mode() === 'demo' && !playing()) {
        <button type="button" class="play" (click)="play()" [attr.aria-label]="'Reproducir demo: ' + project().name">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
        </button>
      }
    } @else if (project().previewVideo) {
      <video [src]="project().previewVideo" [style.object-position]="project().mediaFocus" [attr.poster]="project().previewImage || null" muted loop playsinline
        [autoplay]="!reduceMotion" [controls]="reduceMotion"></video>
    } @else if (project().previewImage) {
      <img [src]="project().previewImage" [style.object-position]="project().mediaFocus" [alt]="project().name" />
    }
  `,
  styles: `
    :host { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; background: #000; }
    video, img { display: block; width: 100%; height: 100%; border: 0; object-fit: contain; }
    img { object-fit: cover; }
    /* .cover (full-bleed hero): the looping clip fills the frame too. */
    :host(.cover) video { object-fit: cover; }
    .play {
      position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 84px; height: 84px; translate: -50% -50%;
      border: 1px solid var(--ember); border-radius: 50%; background: rgba(10, 11, 13, .72); color: var(--ember); cursor: pointer;
      transition: transform .25s var(--ease), background-color .25s;
    }
    .play svg { width: 34px; height: 34px; margin-left: 4px; }
    .play:hover { transform: scale(1.06); background: var(--ember); color: var(--ink); }
    .play:focus-visible { outline: 2px solid var(--ember); outline-offset: 4px; }
    @media (prefers-reduced-motion: reduce) { .play { transition: none; } .play:hover { transform: none; } }
  `,
})
export class ProjectMediaComponent {
  readonly project = input.required<Project>();
  readonly mode = input<'auto' | 'visual' | 'demo'>('auto');

  private readonly demo = viewChild<ElementRef<HTMLVideoElement>>('demo');
  protected readonly playing = signal(false);
  protected readonly showDemo = computed(() => !!this.project().demoVideoUrl && this.mode() !== 'visual');
  protected readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected play(): void {
    const video = this.demo()?.nativeElement;
    if (!video) return;
    this.playing.set(true);
    video.play()?.catch(() => undefined);
  }
}
