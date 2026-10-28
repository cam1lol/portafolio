import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { SiteContentService } from '../data/site-content.service';
import { SoundService } from '../sound/sound.service';
import { SCENE_CACHE_KEY, SCENE_DEFAULTS, SCENE_FIELDS, SceneSettings, applyScene, pickKnown, readCachedScene } from './scene.config';

/**
 * Applies the "Director de escena" settings to the whole site. Starts from the browser cache (so a
 * returning visitor gets them from the first frame) and follows `site_content` once it loads.
 */
@Injectable({ providedIn: 'root' })
export class SceneService {
  private readonly content = inject(SiteContentService);
  private readonly sound = inject(SoundService);

  /** Settings known at startup (cache or defaults); used for decisions taken before data arrives. */
  readonly initial: SceneSettings = readCachedScene();

  readonly settings = computed<SceneSettings>(() => {
    const map = this.content.content();
    if (!Object.keys(map).length) return this.initial;
    const saved = Object.fromEntries(SCENE_FIELDS.map((field) => [field.key, map[field.key]?.es?.trim() ?? '']));
    return { ...SCENE_DEFAULTS, ...pickKnown(saved) };
  });

  constructor() {
    applyScene(this.initial);
    this.content.ensureLoaded();
    effect(() => {
      const settings = this.settings();
      untracked(() => {
        applyScene(settings);
        this.sound.applyDefault(settings.scene_sound === 'on');
        try {
          localStorage.setItem(SCENE_CACHE_KEY, JSON.stringify(settings));
        } catch {}
      });
    });
  }
}
