import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { AdminPageHeaderComponent } from '../shared/admin-page-header.component';
import { ToastService } from '../shared/toast.service';
import { HasUnsavedChanges } from '../shared/unsaved-changes.guard';
import { SiteContentService } from '../../../core/data/site-content.service';
import { SceneService } from '../../../core/scene/scene.service';
import { SCENE_FIELDS, SceneKey, SceneSettings, applyScene } from '../../../core/scene/scene.config';

/**
 * "Director de escena": how the public site performs (rings, rhythm, rain, transitions, intro,
 * sound, light mode). Choices preview live in this browser (the rings run behind the panel too)
 * and reach every visitor once saved; leaving without saving restores the saved scene.
 */
@Component({
  selector: 'app-admin-scene',
  standalone: true,
  imports: [AdminPageHeaderComponent],
  templateUrl: './admin-scene.component.html',
  styleUrls: ['../shared/admin-form.css', './admin-scene.component.css'],
})
export class AdminSceneComponent implements HasUnsavedChanges, OnDestroy {
  private readonly scene = inject(SceneService);
  private readonly siteContent = inject(SiteContentService);
  private readonly toast = inject(ToastService);

  protected readonly fields = SCENE_FIELDS;
  protected readonly draft = signal<SceneSettings>({ ...this.scene.settings() });
  protected readonly saving = signal(false);
  private readonly saved = signal<SceneSettings>({ ...this.scene.settings() });

  protected readonly dirty = computed(() => SCENE_FIELDS.some((field) => this.draft()[field.key] !== this.saved()[field.key]));

  constructor() {
    // The saved scene may arrive after the page opens (direct load): adopt it unless editing.
    effect(() => {
      const settings = this.scene.settings();
      untracked(() => {
        if (this.dirty()) return;
        this.saved.set({ ...settings });
        this.draft.set({ ...settings });
      });
    });
  }

  protected choose(key: SceneKey, value: string): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
    applyScene(this.draft());
  }

  /** Arrow keys move the choice inside a group, like native radio buttons. */
  protected onKey(event: KeyboardEvent, key: SceneKey, values: string[]): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = values[(values.indexOf(this.draft()[key]) + step + values.length) % values.length];
    this.choose(key, next);
    const group = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    setTimeout(() => group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  }

  protected values(key: SceneKey): string[] {
    return SCENE_FIELDS.find((field) => field.key === key)?.options.map((option) => option.value) ?? [];
  }

  protected reset(): void {
    this.draft.set({ ...this.saved() });
    applyScene(this.draft());
  }

  protected save(): void {
    const draft = this.draft();
    const rows = SCENE_FIELDS.map((field) => ({ key: field.key, value_es: draft[field.key], value_en: draft[field.key] }));
    this.saving.set(true);
    this.siteContent.saveMany(rows).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set({ ...draft });
        this.toast.show('Escena guardada. Los visitantes la verán al cargar el sitio.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('No se pudo guardar la escena.', 'error');
      },
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty() && !this.saving();
  }

  ngOnDestroy(): void {
    // Unsaved previews do not stay applied after leaving the page.
    if (this.dirty()) applyScene(this.saved());
  }
}
