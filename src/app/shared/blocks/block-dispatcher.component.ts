import { Component, Input } from '@angular/core';
import { Block } from '../../core/data/block.model';

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
}

@Component({
  selector: 'app-block-dispatcher',
  standalone: true,
  templateUrl: './block-dispatcher.component.html',
  styleUrl: './block-dispatcher.component.css',
})
export class BlockDispatcherComponent {
  @Input({ required: true }) block!: Block;

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
