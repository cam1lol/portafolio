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

  /** undefined mientras carga (entradas de esqueleto), luego la lista. */
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

    // La línea se llena mientras la línea de tiempo cruza el centro de la pantalla, y cada punto se
    // enciende (con un pulso) cuando la línea lo alcanza. Una variable CSS y un cambio de clase por
    // fotograma, solo mientras la línea de tiempo está cerca de la pantalla (lo regula un
    // IntersectionObserver), leyendo todas las posiciones antes de escribir nada.
    let scheduled = false;
    let near = true;
    let last = '';
    const update = () => {
      scheduled = false;
      if (!near) return;
      const rect = host.getBoundingClientRect();
      const middle = window.innerHeight * 0.55;
      const nodes = Array.from(host.querySelectorAll<HTMLElement>('.tl-node'));
      const lit = nodes.map((node) => node.getBoundingClientRect().top + 10 <= middle);
      const progress = Math.min(1, Math.max(0, (middle - rect.top) / Math.max(1, rect.height))).toFixed(4);
      if (progress !== last) {
        last = progress;
        host.style.setProperty('--tl', progress);
      }
      nodes.forEach((node, i) => {
        if (node.classList.contains('lit') !== lit[i]) node.classList.toggle('lit', lit[i]);
      });
    };
    const onScroll = () => {
      if (scheduled || !near) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (near) onScroll();
    }, { rootMargin: '25% 0px' });
    this.zone.runOutsideAngular(() => {
      observer.observe(host);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    });
    this.removeScroll = () => {
      observer.disconnect();
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
