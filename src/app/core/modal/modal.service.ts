import { Injectable, signal } from '@angular/core';
import { Project } from '../data/project.model';
import { Experience } from '../data/experience.model';

export type ModalState =
  | { kind: 'project'; data: Project }
  | { kind: 'experience'; data: Experience }
  | null;

/**
 * Single source of truth for the project/experience modal
 * (camilo-ayala-prototype (2).html `openProject()`/`openXP()`, lines
 * 750-777). `AppModalComponent` reads `active()` and renders nothing while
 * it is `null`.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly active = signal<ModalState>(null);

  openProject(project: Project): void {
    this.active.set({ kind: 'project', data: project });
  }

  openExperience(experience: Experience): void {
    this.active.set({ kind: 'experience', data: experience });
  }

  close(): void {
    this.active.set(null);
  }
}
