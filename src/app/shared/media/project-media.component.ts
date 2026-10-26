import { Component, input } from '@angular/core';
import { Project } from '../../core/data/project.model';

/** True when the project has something real to show (demo video, clip or image). */
export function hasProjectMedia(project: Project): boolean {
  return !!(project.demoVideoUrl || project.previewVideo || project.previewImage);
}

/**
 * Project media, best first: the full demo (a file in public/media/projects, native player that downloads
 * nothing until play), then the looping preview clip, then the still image.
 * Used by the modal and the project page.
 */
@Component({
  selector: 'app-project-media',
  standalone: true,
  template: `
    @if (project().demoVideoUrl) {
      <video [src]="project().demoVideoUrl" [attr.poster]="project().previewImage || null"
        [attr.preload]="project().previewImage ? 'none' : 'metadata'" controls playsinline
        [attr.aria-label]="'Demo: ' + project().name"></video>
    } @else if (project().previewVideo) {
      <video [src]="project().previewVideo" [attr.poster]="project().previewImage || null" muted loop playsinline
        [autoplay]="!reduceMotion" [controls]="reduceMotion"></video>
    } @else if (project().previewImage) {
      <img [src]="project().previewImage" [alt]="project().name" />
    }
  `,
  styles: `
    :host { display: block; aspect-ratio: 16 / 9; overflow: hidden; background: #000; }
    video, img { display: block; width: 100%; height: 100%; border: 0; object-fit: contain; }
    img { object-fit: cover; }
  `,
})
export class ProjectMediaComponent {
  readonly project = input.required<Project>();

  protected readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
