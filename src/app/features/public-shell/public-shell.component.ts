import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HeroComponent } from '../hero/hero.component';
import { TickerComponent } from '../ticker/ticker.component';
import { ManifestoComponent } from '../manifesto/manifesto.component';
import { ProjectsComponent } from '../projects/projects.component';
import { ExperienceComponent } from '../experience/experience.component';
import { ServicesComponent } from '../services/services.component';
import { RoadmapComponent } from '../roadmap/roadmap.component';
import { ContactComponent } from '../contact/contact.component';
import { SectionVisibilityService } from '../../core/data/section-visibility.service';
import { BlocksService } from '../../core/data/blocks.service';
import { Block } from '../../core/data/block.model';
import { BlockDispatcherComponent } from '../../shared/blocks/block-dispatcher.component';

@Component({
  selector: 'app-public-shell',
  imports: [
    HeroComponent,
    TickerComponent,
    ManifestoComponent,
    ProjectsComponent,
    ExperienceComponent,
    ServicesComponent,
    RoadmapComponent,
    ContactComponent,
    BlockDispatcherComponent,
  ],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.css',
})
export class PublicShellComponent {
  private readonly sectionVisibilityService = inject(SectionVisibilityService);
  private readonly blocksService = inject(BlocksService);

  protected readonly visibility = toSignal(this.sectionVisibilityService.getVisibility(), {
    initialValue: {} as Record<string, boolean>,
  });

  protected readonly homeBlocks = toSignal(this.blocksService.getPublished('home'), {
    initialValue: [] as Block[],
  });
}
