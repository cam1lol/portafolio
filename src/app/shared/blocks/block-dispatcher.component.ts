import { Component, Input, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Block } from '../../core/data/block.model';
import { Gallery3dComponent } from '../gallery-3d/gallery-3d.component';

interface HeroConfig {
  eyebrow?: string;
  title: string;
  lead?: string;
}

interface CardGridItem {
  title: string;
  description: string;
  icon?: string;
}

interface CardGridConfig {
  title?: string;
  items: CardGridItem[];
}

interface RoadmapItem {
  when: string;
  title: string;
  description: string;
}

interface RoadmapConfig {
  title?: string;
  items: RoadmapItem[];
}

interface TextConfig {
  title?: string;
  body: string;
}

interface Gallery3dConfig {
  title?: string;
  description?: string;
  modelPath?: string;
  modelAuthor?: string;
  modelLicense?: string;
  viewer?: { height?: 'compact' | 'standard' | 'tall'; autoRotate?: boolean; zoomEnabled?: boolean };
}

interface BlockLayout {
  width: 'small' | 'medium' | 'wide' | 'full';
  alignment: 'left' | 'center' | 'right';
  background: 'transparent' | 'surface';
  surfaceOpacity: string;
  border: boolean;
  spacing: 'compact' | 'normal' | 'spacious';
}

@Component({
  selector: 'app-block-dispatcher',
  standalone: true,
  imports: [Gallery3dComponent],
  templateUrl: './block-dispatcher.component.html',
  styleUrl: './block-dispatcher.component.css',
})
export class BlockDispatcherComponent {
  private readonly transloco = inject(TranslocoService);

  @Input({ required: true }) block!: Block;
  /** Forces a language (admin preview); defaults to the active site language. */
  @Input() lang: 'es' | 'en' | null = null;

  /**
   * Bilingual config: the base key holds Spanish, `<key>_en` holds English.
   * Blocks created before the bilingual form only have the base key, so English falls back to it.
   */
  private text(source: Record<string, unknown> | undefined, key: string): string {
    if (!source) return '';
    const base = typeof source[key] === 'string' ? (source[key] as string) : '';
    const lang = this.lang ?? (this.transloco.activeLang() === 'en' ? 'en' : 'es');
    if (lang !== 'en') return base;
    const english = source[`${key}_en`];
    return typeof english === 'string' && english.trim() ? english : base;
  }

  private items(): Array<Record<string, unknown>> {
    const raw = this.block.config['items'];
    return Array.isArray(raw) ? raw.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
  }

  protected get layout(): BlockLayout {
    const raw = (this.block.config['layout'] ?? {}) as Record<string, unknown>;
    const allowed = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
      typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
    const opacity = typeof raw['backgroundOpacity'] === 'number' ? Math.max(0, Math.min(100, raw['backgroundOpacity'])) : 35;
    return {
      width: allowed(raw['width'], ['small', 'medium', 'wide', 'full'], 'full'),
      alignment: allowed(raw['alignment'], ['left', 'center', 'right'], 'center'),
      background: allowed(raw['background'], ['transparent', 'surface'], 'transparent'),
      surfaceOpacity: `${opacity}%`,
      border: raw['border'] === true,
      spacing: allowed(raw['spacing'], ['compact', 'normal', 'spacious'], 'normal'),
    };
  }

  protected get layoutClasses(): string {
    const layout = this.layout;
    return `block block--width-${layout.width} block--align-${layout.alignment} block--spacing-${layout.spacing} ${layout.background === 'surface' ? 'block--surface' : ''} ${layout.border ? 'block--border' : ''} ${this.block.type === 'gallery_3d' ? 'gallery-3d-block' : ''}`;
  }

  protected get heroConfig(): HeroConfig {
    const config = this.block.config;
    return { eyebrow: this.text(config, 'eyebrow'), title: this.text(config, 'title'), lead: this.text(config, 'lead') };
  }

  protected get cardGridConfig(): CardGridConfig {
    return {
      title: this.text(this.block.config, 'title'),
      items: this.items().map((item) => ({
        title: this.text(item, 'title'),
        description: this.text(item, 'description'),
        icon: typeof item['icon'] === 'string' ? (item['icon'] as string) : undefined,
      })),
    };
  }

  protected get roadmapConfig(): RoadmapConfig {
    return {
      title: this.text(this.block.config, 'title'),
      items: this.items().map((item) => ({
        when: this.text(item, 'when'),
        title: this.text(item, 'title'),
        description: this.text(item, 'description'),
      })),
    };
  }

  protected get textConfig(): TextConfig {
    return { title: this.text(this.block.config, 'title'), body: this.text(this.block.config, 'body') };
  }

  protected get gallery3dConfig(): Gallery3dConfig {
    const config = this.block.config as unknown as Gallery3dConfig;
    return {
      ...config,
      title: this.text(this.block.config, 'title'),
      description: this.text(this.block.config, 'description'),
    };
  }
}
