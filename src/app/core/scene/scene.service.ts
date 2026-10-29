import { Injectable, computed, effect, inject, untracked } from '@angular/core';
import { SiteContentService } from '../data/site-content.service';
import { SoundService } from '../sound/sound.service';
import { SCENE_CACHE_KEY, SCENE_DEFAULTS, SCENE_FIELDS, SceneSettings, applyScene, pickKnown, readCachedScene } from './scene.config';

/**
 * Aplica los ajustes del "Director de escena" a todo el sitio. Arranca con la copia del navegador
 * (un visitante que vuelve los tiene desde el primer fotograma) y sigue a `site_content` cuando carga.
 */
@Injectable({ providedIn: 'root' })
export class SceneService {
  private readonly content = inject(SiteContentService);
  private readonly sound = inject(SoundService);

  /** Ajustes conocidos al arrancar (copia o valores por defecto); para decisiones previas a los datos. */
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
