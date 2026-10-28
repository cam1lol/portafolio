import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeroComponent } from '../hero/hero.component';
import { TickerComponent } from '../ticker/ticker.component';
import { ManifestoComponent } from '../manifesto/manifesto.component';
import { ProjectsComponent } from '../projects/projects.component';
import { ExperienceComponent } from '../experience/experience.component';
import { ServicesComponent } from '../services/services.component';
import { RoadmapComponent } from '../roadmap/roadmap.component';
import { ContactComponent } from '../contact/contact.component';
import { CommentsComponent } from '../comments/comments.component';
import { ClientsComponent } from '../clients/clients.component';
import { TestimonialsComponent } from '../testimonials/testimonials.component';
import { LabComponent } from '../lab/lab.component';
import { LogComponent } from '../log/log.component';
import { SectionVisibilityService } from '../../core/data/section-visibility.service';
import { BlocksService } from '../../core/data/blocks.service';
import { Block } from '../../core/data/block.model';
import { BlockDispatcherComponent } from '../../shared/blocks/block-dispatcher.component';
import { PageItem, PageItemsService } from '../../core/data/page-items.service';

const SECTION_ORDER = ['hero', 'ticker', 'manifesto', 'projects', 'clients', 'lab', 'experience', 'testimonials', 'services', 'roadmap', 'log', 'comments', 'contact'];

type RenderItem =
  | { key: string; kind: 'section'; sectionKey: string }
  | { key: string; kind: 'block'; block: Block };

@Component({
  selector: 'app-public-shell',
  imports: [
    LabComponent,
    LogComponent,
    HeroComponent,
    TickerComponent,
    ManifestoComponent,
    ProjectsComponent,
    ExperienceComponent,
    ServicesComponent,
    RoadmapComponent,
    ContactComponent,
    CommentsComponent,
    ClientsComponent,
    TestimonialsComponent,
    BlockDispatcherComponent,
  ],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.css',
})
export class PublicShellComponent {
  private readonly sectionVisibilityService = inject(SectionVisibilityService);
  private readonly blocksService = inject(BlocksService);
  private readonly pageItemsService = inject(PageItemsService);

  protected readonly visibility = toSignal(this.sectionVisibilityService.getVisibility(), {
    initialValue: {} as Record<string, boolean>,
  });

  protected readonly homeBlocks = toSignal(this.blocksService.getPublished('home'), {
    initialValue: [] as Block[],
  });

  private readonly savedLayout = toSignal(this.pageItemsService.getPageItems('home'), {
    initialValue: [] as PageItem[],
  });

  protected readonly layoutItems = computed<RenderItem[]>(() => {
    const blocks = this.homeBlocks();
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const saved = this.savedLayout();
    const result: RenderItem[] = [];
    const seenSections = new Set<string>();
    const seenBlocks = new Set<string>();

    for (const item of [...saved].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (item.kind === 'section' && item.sectionKey && SECTION_ORDER.includes(item.sectionKey)) {
        if (!seenSections.has(item.sectionKey)) {
          result.push({ key: item.key, kind: 'section', sectionKey: item.sectionKey });
          seenSections.add(item.sectionKey);
        }
      } else if (item.kind === 'block' && item.blockId) {
        const block = blockById.get(item.blockId);
        if (block && !seenBlocks.has(block.id)) {
          result.push({ key: item.key, kind: 'block', block });
          seenBlocks.add(block.id);
        }
      }
    }

    // Keep the page usable before the migration is applied and include new content
    // created after the current layout was last saved.
    for (const sectionKey of SECTION_ORDER) {
      if (!seenSections.has(sectionKey)) {
        result.push({ key: `section:${sectionKey}`, kind: 'section', sectionKey });
      }
    }
    for (const block of blocks) {
      if (!seenBlocks.has(block.id)) result.push({ key: `block:${block.id}`, kind: 'block', block });
    }
    return result;
  });
}
