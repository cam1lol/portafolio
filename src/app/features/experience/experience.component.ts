import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, viewChild, } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ExperienceService } from '../../core/data/experience.service';
import { Experience } from '../../core/data/experience.model';
import { ModalService } from '../../core/modal/modal.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [TranslocoPipe, RevealDirective, IconComponent],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css',
})
export class ExperienceComponent implements AfterViewInit, OnDestroy {
  private readonly transloco = inject(TranslocoService);
  private readonly modalService = inject(ModalService);

  private readonly timelineRef = viewChild<ElementRef<HTMLElement>>('timeline');
  private timelineObserver?: IntersectionObserver;

  private readonly experienceService = inject(ExperienceService);

  protected readonly EXPERIENCE = toSignal(this.experienceService.getPublished(), {
    initialValue: [] as Experience[],
  });

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

    this.timelineObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            host.classList.add('draw');
            this.timelineObserver?.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    this.timelineObserver.observe(host);
  }

  ngOnDestroy(): void {
    this.timelineObserver?.disconnect();
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
