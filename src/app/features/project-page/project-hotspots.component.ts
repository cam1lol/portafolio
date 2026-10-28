import { Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ProjectHotspot } from '../../core/data/project-details';
import { ScanRevealDirective } from '../../shared/directives/scan-reveal.directive';

/**
 * "Dentro del producto" (A8): the card image with numbered points; each one opens its label on
 * hover, focus or tap. The label opens towards the side with more room. The pulse runs a few
 * times and stops (transform and opacity only).
 */
@Component({
  selector: 'app-project-hotspots',
  imports: [ScanRevealDirective],
  standalone: true,
  template: `
    <div class="shot" appScanReveal>
      <img [src]="image()" [alt]="alt()" loading="lazy" />
      @for (spot of spots(); track $index; let i = $index) {
        <button type="button" class="spot" [class.flip]="spot.x > 60" [style.left.%]="spot.x" [style.top.%]="spot.y">
          <span class="dot mono" aria-hidden="true">{{ i + 1 }}</span>
          <span class="lbl">{{ spot.label }}</span>
        </button>
      }
    </div>
    <ol class="legend">
      @for (spot of spots(); track $index; let i = $index) {
        <li><span class="mono">{{ i + 1 }}</span>{{ spot.label }}</li>
      }
    </ol>
  `,
  styleUrl: './project-hotspots.component.css',
})
export class ProjectHotspotsComponent {
  readonly image = input.required<string>();
  readonly hotspots = input.required<ProjectHotspot[]>();
  readonly alt = input('');

  private readonly transloco = inject(TranslocoService);

  protected readonly spots = computed(() => {
    const en = this.transloco.activeLang() === 'en';
    return this.hotspots()
      .map((spot) => ({ x: spot.x, y: spot.y, label: (en ? spot.labelEn || spot.labelEs : spot.labelEs || spot.labelEn).trim() }))
      .filter((spot) => spot.label);
  });
}
