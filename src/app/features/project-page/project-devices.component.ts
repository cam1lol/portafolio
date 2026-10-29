import { Component, DestroyRef, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { ScrollFrameService } from '../../shared/perf/scroll-frame.service';
import { PlayWhileVisibleDirective } from '../../shared/media/play-while-visible.directive';

/**
 * "Escritorio y móvil" (A7). Con versión web y móvil: la captura de escritorio en un marco de navegador
 * y el teléfono, girados en 3D, se enderezan y se separan en profundidad mientras la sección cruza la
 * pantalla. Solo con versión móvil: el teléfono solo, centrado. El teléfono reproduce el clip móvil
 * (solo mientras se ve) o muestra la primera captura; las demás siguen en una fila de teléfonos.
 * Transforms solo en divs envoltorio, escritos cuando cambian y solo mientras se ven.
 */
@Component({
  selector: 'app-project-devices',
  standalone: true,
  imports: [PlayWhileVisibleDirective],
  template: `
    <div class="stage" [class.solo]="!desktop()">
      @if (desktop()) {
        <div class="desk" #desk>
          <div class="browser">
            <div class="chrome mono" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span><span class="url">{{ url() }}</span></div>
            <img [src]="desktop()" [alt]="desktopAlt()" loading="lazy" />
          </div>
        </div>
      }
      <div class="phone" #phone>
        <div class="body">
          @if (video()) {
            <video appPlayWhileVisible [src]="video()" [attr.poster]="images()[0] || null" muted loop playsinline preload="metadata" [attr.aria-label]="phoneAlt()"></video>
          } @else {
            <img [src]="images()[0]" [alt]="phoneAlt()" loading="lazy" />
          }
        </div>
      </div>
    </div>
    @if (rest().length) {
      <div class="row">
        @for (src of rest(); track $index; let i = $index) {
          <div class="body small"><img [src]="src" [alt]="phoneAlt() + ' ' + (i + 2)" loading="lazy" /></div>
        }
      </div>
    }
  `,
  styleUrl: './project-devices.component.css',
})
export class ProjectDevicesComponent {
  /** Captura de escritorio (la imagen de la tarjeta); vacía en el diseño de solo teléfono. */
  readonly desktop = input('');
  readonly video = input('');
  readonly images = input<string[]>([]);
  readonly url = input('');
  readonly desktopAlt = input('');
  readonly phoneAlt = input('');

  /** Capturas que no salen en el teléfono principal. */
  protected readonly rest = computed(() => (this.video() ? this.images() : this.images().slice(1)));

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly desk = viewChild<ElementRef<HTMLElement>>('desk');
  private readonly phone = viewChild.required<ElementRef<HTMLElement>>('phone');

  constructor() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = '';
    inject(ScrollFrameService).register(
      {
        read: (frame) => {
          const rect = this.host.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > frame.viewportHeight) return null;
          // 0 cuando la sección entra por abajo, 1 cuando su centro llega arriba de la pantalla.
          return Math.min(1, Math.max(0, 1 - (rect.top + rect.height / 2) / frame.viewportHeight));
        },
        write: (progress, frame) => {
          if (progress === null) return;
          const reach = frame.viewportWidth < 620 ? 0.35 : 1; // menos recorrido lateral en móvil, para que no se salga del margen
          const p = Math.round(progress * 100) / 100;
          const key = String(p);
          if (key === last) return;
          last = key;
          const turn = 1 - Math.min(1, p * 1.6); // recto cuando ya se ve bien
          const open = Math.sin(p * Math.PI); // máxima separación en el centro de la pantalla
          const desk = this.desk()?.nativeElement;
          if (desk) {
            desk.style.transform = `rotateY(${(16 * turn).toFixed(2)}deg) translate3d(${(-24 * open * reach).toFixed(1)}px, 0, ${(-50 * open).toFixed(1)}px)`;
            this.phone().nativeElement.style.transform = `rotateY(${(-16 * turn).toFixed(2)}deg) translate3d(0, ${(-22 * open).toFixed(1)}px, ${(80 * open).toFixed(1)}px)`;
          } else {
            // Teléfono solo: gira hacia el visitante y sube un poco.
            this.phone().nativeElement.style.transform = `rotateY(${(-20 * turn).toFixed(2)}deg) translate3d(0, ${(-16 * open).toFixed(1)}px, 0)`;
          }
        },
      },
      inject(DestroyRef),
    );
  }
}
