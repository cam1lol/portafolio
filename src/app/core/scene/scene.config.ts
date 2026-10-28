/**
 * "Director de escena": how the site performs, set from the admin (Escena) and stored in
 * `site_content` as `scene_*` keys (no migration). Each setting has a safe default, which is
 * exactly how the site behaves when nothing has been saved.
 */
export interface SceneOption {
  value: string;
  label: string;
  hint: string;
}

export interface SceneField {
  key: SceneKey;
  label: string;
  help: string;
  fallback: string;
  options: SceneOption[];
}

export type SceneKey = 'scene_rings' | 'scene_rain' | 'scene_speed' | 'scene_transition' | 'scene_boot' | 'scene_sound' | 'scene_lite';
export type SceneSettings = Record<SceneKey, string>;

export const SCENE_FIELDS: SceneField[] = [
  {
    key: 'scene_rings',
    label: 'Anillos de fondo',
    help: 'El círculo rúnico que gira detrás de todo el sitio.',
    fallback: 'full',
    options: [
      { value: 'full', label: 'Completos', hint: 'Como está ahora.' },
      { value: 'soft', label: 'Suaves', hint: 'Más transparentes, el texto destaca más.' },
      { value: 'off', label: 'Ocultos', hint: 'Fondo liso.' },
    ],
  },
  {
    key: 'scene_speed',
    label: 'Ritmo del fondo',
    help: 'Velocidad de giro de los anillos.',
    fallback: 'normal',
    options: [
      { value: 'calm', label: 'Tranquilo', hint: 'Un 60 % más lento.' },
      { value: 'normal', label: 'Normal', hint: 'Como está ahora.' },
      { value: 'lively', label: 'Vivo', hint: 'Un 35 % más rápido.' },
    ],
  },
  {
    key: 'scene_rain',
    label: 'Lluvia de estrellas',
    help: 'Los trazos fugaces que cruzan la pantalla cada pocos segundos.',
    fallback: 'normal',
    options: [
      { value: 'normal', label: 'Normal', hint: 'Como está ahora.' },
      { value: 'low', label: 'Poca', hint: 'La mitad de frecuente, de uno en uno.' },
      { value: 'off', label: 'Sin lluvia', hint: '' },
    ],
  },
  {
    key: 'scene_transition',
    label: 'Transición al abrir un proyecto',
    help: 'Lo que pasa entre la lista de proyectos y la página de uno.',
    fallback: 'full',
    options: [
      { value: 'full', label: 'Completa', hint: 'Apertura circular, anillo y rótulo HUD.' },
      { value: 'simple', label: 'Sencilla', hint: 'La tarjeta crece y el contenido sube.' },
      { value: 'none', label: 'Sin animación', hint: 'Cambio inmediato.' },
    ],
  },
  {
    key: 'scene_boot',
    label: 'Intro en la primera visita',
    help: 'La secuencia de arranque que ve cada visitante una sola vez.',
    fallback: 'on',
    options: [
      { value: 'on', label: 'Mostrar', hint: 'Como está ahora.' },
      { value: 'off', label: 'No mostrar', hint: 'Se entra directo a la portada.' },
    ],
  },
  {
    key: 'scene_sound',
    label: 'Sonido de interfaz por defecto',
    help: 'Clics y transiciones. El visitante siempre puede cambiarlo con el botón del header.',
    fallback: 'off',
    options: [
      { value: 'off', label: 'Apagado', hint: 'Recomendado: no sorprende a nadie.' },
      { value: 'on', label: 'Encendido', hint: 'Suena tras la primera interacción.' },
    ],
  },
  {
    key: 'scene_lite',
    label: 'Modo ligero',
    help: 'Efectos más baratos (sin brillo en los anillos, sin grano ni lluvia, transición sencilla).',
    fallback: 'auto',
    options: [
      { value: 'auto', label: 'Automático', hint: 'Solo en equipos que no llegan a ~45 fps.' },
      { value: 'always', label: 'Siempre', hint: 'Para todos los visitantes, por si algo va lento.' },
    ],
  },
];

export const SCENE_DEFAULTS = Object.fromEntries(SCENE_FIELDS.map((field) => [field.key, field.fallback])) as SceneSettings;

/** Browser cache of the last settings seen, so the next visit starts with them (before Supabase answers). */
export const SCENE_CACHE_KEY = 'ca-scene-v1';

export function readCachedScene(): SceneSettings {
  try {
    const cached = JSON.parse(localStorage.getItem(SCENE_CACHE_KEY) || '{}') as Partial<SceneSettings>;
    return { ...SCENE_DEFAULTS, ...pickKnown(cached) };
  } catch {
    return { ...SCENE_DEFAULTS };
  }
}

/** Keeps only known keys with one of their allowed values. */
export function pickKnown(values: Partial<Record<string, string>>): Partial<SceneSettings> {
  const out: Partial<SceneSettings> = {};
  for (const field of SCENE_FIELDS) {
    const value = values[field.key];
    if (value && field.options.some((option) => option.value === value)) out[field.key] = value;
  }
  return out;
}

/** Ring spin duration multiplier per rhythm (CSS --scene-spin). */
export const SPIN_SCALE: Record<string, string> = { calm: '1.6', normal: '1', lively: '0.65' };

/** Writes the settings onto <html> (data attributes and a CSS variable) for CSS and effects to read. */
export function applyScene(settings: SceneSettings, root: HTMLElement = document.documentElement): void {
  root.dataset['sceneRings'] = settings.scene_rings;
  root.dataset['sceneRain'] = settings.scene_rain;
  root.dataset['sceneTransition'] = settings.scene_transition;
  root.style.setProperty('--scene-spin', SPIN_SCALE[settings.scene_speed] ?? '1');
  if (settings.scene_lite === 'always') root.classList.add('fx-lite');
}
