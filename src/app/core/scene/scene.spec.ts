import { SCENE_CACHE_KEY, SCENE_DEFAULTS, applyScene, pickKnown, readCachedScene } from './scene.config';

describe('Director de escena', () => {
  afterEach(() => localStorage.removeItem(SCENE_CACHE_KEY));

  it('sin nada guardado usa los valores por defecto, que son el sitio tal como está', () => {
    expect(readCachedScene()).toEqual(SCENE_DEFAULTS);
    expect(SCENE_DEFAULTS.scene_rings).toBe('full');
    expect(SCENE_DEFAULTS.scene_lite).toBe('auto');
  });

  it('descarta claves desconocidas y valores no permitidos', () => {
    expect(pickKnown({ scene_rings: 'soft', scene_rain: 'tormenta', otra: 'x' })).toEqual({ scene_rings: 'soft' });
    localStorage.setItem(SCENE_CACHE_KEY, '{roto');
    expect(readCachedScene()).toEqual(SCENE_DEFAULTS);
  });

  it('aplica los ajustes en <html> y el modo ligero "siempre"', () => {
    const root = document.createElement('html');
    applyScene({ ...SCENE_DEFAULTS, scene_rings: 'off', scene_speed: 'calm', scene_transition: 'none', scene_lite: 'always' }, root);
    expect(root.dataset['sceneRings']).toBe('off');
    expect(root.dataset['sceneTransition']).toBe('none');
    expect(root.style.getPropertyValue('--scene-spin')).toBe('1.6');
    expect(root.classList.contains('fx-lite')).toBeTrue();
  });
});
