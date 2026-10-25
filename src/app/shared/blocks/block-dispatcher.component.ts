import { Component, Input } from '@angular/core';
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
  @Input({ required: true }) block!: Block;

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
    return this.block.config as unknown as HeroConfig;
  }

  protected get cardGridConfig(): CardGridConfig {
    const config = this.block.config as unknown as CardGridConfig;
    return { title: config.title, items: config.items ?? [] };
  }

  protected get roadmapConfig(): RoadmapConfig {
    const config = this.block.config as unknown as RoadmapConfig;
    return { title: config.title, items: config.items ?? [] };
  }

  protected get textConfig(): TextConfig {
    return this.block.config as unknown as TextConfig;
  }

  protected get gallery3dConfig(): Gallery3dConfig {
    return this.block.config as unknown as Gallery3dConfig;
  }
}
