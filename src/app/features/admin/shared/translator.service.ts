import { Injectable, signal } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/** Chrome's built-in Translator API (Chrome 138+): on-device, free, no key, texts never leave the computer. */
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

/** The first use downloads Chrome's language model; past this, give up with a clear message. */
const PREPARE_TIMEOUT_MS = 3 * 60_000;

/** A Spanish control and its English sibling (`summaryEs` / `summaryEn`). */
export interface TranslationPair {
  es: AbstractControl<string>;
  en: AbstractControl<string>;
}

/**
 * Spanish to English for the admin forms. Fills English only when it is empty, or when it still holds
 * an automatic translation nobody edited: whatever was written or corrected by hand is never replaced.
 */
@Injectable({ providedIn: 'root' })
export class TranslatorService {
  private readonly api = (globalThis as { Translator?: TranslatorStatic }).Translator;
  private translator: Promise<BuiltInTranslator> | null = null;
  /** English controls filled automatically, with the text that was put there. */
  private readonly auto = new WeakMap<AbstractControl, string>();
  /** Bumped when the automatic set changes, for badges and counters. */
  readonly version = signal(0);
  readonly state = signal<TranslatorState>(this.api ? 'downloadable' : 'unsupported');
  /** Download of the language model, 0-100 (first use only). */
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

  /** Paragraph by paragraph, so blank lines (and the markup inside each paragraph) are kept. */
  async translate(text: string): Promise<string> {
    if (!this.api || !text.trim()) return '';
    this.translator ??= this.prepare();
    const translator = await this.translator;
    const parts = text.split(/(\n\s*\n)/);
    const out = await Promise.all(parts.map((part, i) => (i % 2 || !part.trim() ? part : translator.translate(part))));
    return out.join('');
  }

  /** Creates the translator (downloading the model the first time), with progress and a time limit. */
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

  /** True while the English control still holds the automatic translation (not edited by hand). */
  isAuto(control: AbstractControl | null | undefined): boolean {
    this.version();
    return !!control && this.auto.has(control) && this.auto.get(control) === control.value;
  }

  /** English is free to (re)fill: empty, or untouched automatic text. */
  canFill(en: AbstractControl): boolean {
    return !String(en.value ?? '').trim() || this.isAuto(en);
  }

  /** Translates one pair if the English side is free; returns whether it wrote something. */
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

  /** Translates every free pair; returns how many were filled. */
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

/** Every `xxxEs` / `xxxEn` sibling pair under a form (groups and arrays included). */
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

/** Whether `target` is `control` or lives inside it. */
export function containsControl(control: AbstractControl, target: AbstractControl): boolean {
  if (control === target) return true;
  if (control instanceof FormGroup) return Object.values(control.controls).some((child) => containsControl(child, target));
  if (control instanceof FormArray) return control.controls.some((child) => containsControl(child, target));
  return false;
}
