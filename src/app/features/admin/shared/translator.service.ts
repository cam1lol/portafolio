import { Injectable, signal } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/** La Translator API integrada en Chrome (Chrome 138+): en el propio equipo, gratis, sin clave; los textos nunca salen del ordenador. */
interface BuiltInTranslator {
  translate(text: string): Promise<string>;
}
interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<BuiltInTranslator>;
}

export type TranslatorState = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'ready' | 'working';

/** El primer uso descarga el modelo de idioma de Chrome; pasado este tiempo se abandona con un mensaje claro. */
const PREPARE_TIMEOUT_MS = 3 * 60_000;

/** Un control en español y su hermano en inglés (`summaryEs` / `summaryEn`). */
export interface TranslationPair {
  es: AbstractControl<string>;
  en: AbstractControl<string>;
}

/**
 * Español a inglés para los formularios del admin. Solo rellena el inglés si está vacío o si aún tiene una
 * traducción automática que nadie editó: lo escrito o corregido a mano nunca se reemplaza.
 */
@Injectable({ providedIn: 'root' })
export class TranslatorService {
  private readonly api = (globalThis as { Translator?: TranslatorStatic }).Translator;
  private translator: Promise<BuiltInTranslator> | null = null;
  /** Controles en inglés rellenados automáticamente, con el texto que se puso. */
  private readonly auto = new WeakMap<AbstractControl, string>();
  /** Se incrementa cuando cambia el conjunto automático, para marcas y contadores. */
  readonly version = signal(0);
  readonly state = signal<TranslatorState>(this.api ? 'downloadable' : 'unsupported');
  /** Descarga del modelo de idioma, 0-100 (solo el primer uso). */
  readonly progress = signal(0);

  constructor() {
    this.api
      ?.availability({ sourceLanguage: 'es', targetLanguage: 'en' })
      .then((availability) => this.state.set(availability === 'available' ? 'ready' : availability === 'unavailable' ? 'unavailable' : 'downloadable'))
      .catch(() => this.state.set('unavailable'));
  }

  get supported(): boolean {
    return !!this.api && this.state() !== 'unavailable';
  }

  /** Párrafo a párrafo, para conservar las líneas en blanco (y el marcado dentro de cada párrafo). */
  async translate(text: string): Promise<string> {
    if (!this.api || !text.trim()) return '';
    this.translator ??= this.prepare();
    const translator = await this.translator;
    const parts = text.split(/(\n\s*\n)/);
    const out = await Promise.all(parts.map((part, i) => (i % 2 || !part.trim() ? part : translator.translate(part))));
    return out.join('');
  }

  /** Crea el traductor (descargando el modelo la primera vez), con progreso y un límite de tiempo. */
  private prepare(): Promise<BuiltInTranslator> {
    const api = this.api!;
    if (this.state() !== 'ready') this.state.set('downloading');
    const created = api.create({
      sourceLanguage: 'es',
      targetLanguage: 'en',
      monitor: (monitor) =>
        monitor.addEventListener('downloadprogress', (event) => this.progress.set(Math.round(((event as ProgressEvent).loaded || 0) * 100))),
    });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), PREPARE_TIMEOUT_MS));
    return Promise.race([created, timeout]).then(
      (translator) => {
        this.state.set('ready');
        return translator;
      },
      (error) => {
        this.translator = null;
        this.state.set('downloadable');
        throw error;
      },
    );
  }

  /** True mientras el control en inglés conserva la traducción automática (sin editar a mano). */
  isAuto(control: AbstractControl | null | undefined): boolean {
    this.version();
    return !!control && this.auto.has(control) && this.auto.get(control) === control.value;
  }

  /** El inglés se puede (re)llenar: vacío o con texto automático sin tocar. */
  canFill(en: AbstractControl): boolean {
    return !String(en.value ?? '').trim() || this.isAuto(en);
  }

  /** Traduce un par si el lado en inglés está libre; devuelve si escribió algo. */
  async fill(pair: TranslationPair): Promise<boolean> {
    const source = String(pair.es.value ?? '');
    if (!source.trim() || !this.canFill(pair.en)) return false;
    const translated = (await this.translate(source)).trim();
    if (!translated || !this.canFill(pair.en)) return false;
    pair.en.setValue(translated);
    pair.en.markAsDirty();
    this.auto.set(pair.en, translated);
    this.version.update((n) => n + 1);
    return true;
  }

  /** Traduce todos los pares libres; devuelve cuántos rellenó. */
  async fillAll(pairs: TranslationPair[]): Promise<number> {
    let filled = 0;
    for (const pair of pairs) {
      if (await this.fill(pair)) filled++;
      if (this.state() === 'ready') this.state.set('working');
    }
    if (this.state() === 'working') this.state.set('ready');
    return filled;
  }
}

/** Todos los pares hermanos `xxxEs` / `xxxEn` de un formulario (incluidos grupos y arrays). */
export function translationPairs(root: AbstractControl): TranslationPair[] {
  const pairs: TranslationPair[] = [];
  const walk = (control: AbstractControl) => {
    if (control instanceof FormGroup) {
      for (const [key, child] of Object.entries(control.controls)) {
        if (key.endsWith('Es')) {
          const sibling = control.controls[key.slice(0, -2) + 'En'];
          if (sibling && typeof child.value === 'string') pairs.push({ es: child as AbstractControl<string>, en: sibling as AbstractControl<string> });
        }
        walk(child);
      }
    } else if (control instanceof FormArray) {
      control.controls.forEach(walk);
    }
  };
  walk(root);
  return pairs;
}

/** Si `target` es `control` o vive dentro de él. */
export function containsControl(control: AbstractControl, target: AbstractControl): boolean {
  if (control === target) return true;
  if (control instanceof FormGroup) return Object.values(control.controls).some((child) => containsControl(child, target));
  if (control instanceof FormArray) return control.controls.some((child) => containsControl(child, target));
  return false;
}
