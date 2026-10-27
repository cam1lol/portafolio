import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { SiteTextPipe } from '../../shared/site-text/site-text.pipe';
import { ExperienceService } from '../../core/data/experience.service';
import { Experience } from '../../core/data/experience.model';
import { ModalService } from '../../core/modal/modal.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { IconComponent } from '../../shared/icons/icon.component';
import { ScrambleDirective } from '../../shared/directives/scramble.directive';
import { CvButtonComponent } from '../../shared/cv-button/cv-button.component';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [RevealDirective, IconComponent, SiteTextPipe, CvButtonComponent, ScrambleDirective],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css',
})
export class ExperienceComponent implements AfterViewInit, OnDestroy {
  private readonly transloco = inject(TranslocoService);
  private readonly zone = inject(NgZone);
  private removeScroll?: () => void;
  private readonly modalService = inject(ModalService);

  private readonly timelineRef = viewChild<ElementRef<HTMLElement>>('timeline');

  private readonly experienceService = inject(ExperienceService);

  /** undefined while loading (skeleton entries), then the list. */
  private readonly loadedExperience = toSignal(this.experienceService.getPublished());
  protected readonly loading = computed(() => this.loadedExperience() === undefined);
  protected readonly EXPERIENCE = computed<Experience[]>(() => this.loadedExperience() ?? []);

  private readonly lang = this.transloco.activeLang;
  protected readonly isEs = computed(() => this.lang() === 'es');

  ngAfterViewInit(): void {
    const host = this.timelineRef()?.nativeElement;
    if (!host) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      host.classList.add('draw');
      return;
    }

    // The line fills as the timeline crosses the middle of the screen, and each node lights up
    // (with a pulse) once the line reaches it. One CSS variable and a class toggle per frame.
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const rect = host.getBoundingClientRect();
      const middle = window.innerHeight * 0.55;
      const progress = Math.min(1, Math.max(0, (middle - rect.top) / Math.max(1, rect.height)));
      host.style.setProperty('--tl', progress.toFixed(4));
      host.querySelectorAll<HTMLElement>('.tl-node').forEach((node) => {
        node.classList.toggle('lit', node.getBoundingClientRect().top + 10 <= middle);
      });
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    });
    this.removeScroll = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }

  ngOnDestroy(): void {
    this.removeScroll?.();
  }

  protected period(experience: Experience): string {
    return this.isEs() ? experience.periodEs : experience.periodEn;
  }

  protected tag(experience: Experience): string {
    return this.isEs() ? experience.tagEs : experience.tagEn;
  }

  protected role(experience: Experience): string {
    return this.isEs() ? experience.roleEs : experience.roleEn;
  }

  protected summary(experience: Experience): string {
    return this.isEs() ? experience.summaryEs : experience.summaryEn;
  }

  protected detailLabel(): string {
    return this.isEs() ? 'VER DETALLE' : 'VIEW DETAIL';
  }

  openExperience(experience: Experience): void {
    this.modalService.openExperience(experience);
  }
}
