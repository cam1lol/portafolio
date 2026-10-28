import { Component, DestroyRef, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { ScrollFrameService } from '../../shared/perf/scroll-frame.service';
import { PlayWhileVisibleDirective } from '../../shared/media/play-while-visible.directive';

/**
 * "Escritorio y móvil" (A7). With a web and a mobile version: the desktop capture in a browser
 * frame and the phone, turned in 3D, straighten up and separate in depth while the section
 * crosses the screen. With only the mobile version: the phone alone, centered. The phone plays the
 * mobile clip (only while visible) or shows the first capture; the other captures follow in a row
 * of phones. Transforms on wrapper divs only, written when they change and only while on screen.
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
  /** Desktop capture (the card image); empty for the phone-only layout. */
  readonly desktop = input('');
  readonly video = input('');
  readonly images = input<string[]>([]);
  readonly url = input('');
  readonly desktopAlt = input('');
  readonly phoneAlt = input('');

  /** Captures not shown in the main phone. */
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
          // 0 when the section enters from below, 1 when its middle reaches the top of the screen.
          return Math.min(1, Math.max(0, 1 - (rect.top + rect.height / 2) / frame.viewportHeight));
        },
        write: (progress, frame) => {
          if (progress === null) return;
          const reach = frame.viewportWidth < 620 ? 0.35 : 1; // less sideways travel on phones, so it stays in the gutter
          const p = Math.round(progress * 100) / 100;
          const key = String(p);
          if (key === last) return;
          last = key;
          const turn = 1 - Math.min(1, p * 1.6); // straight by the time it is well in view
          const open = Math.sin(p * Math.PI); // most separated in the middle of the screen
          const desk = this.desk()?.nativeElement;
          if (desk) {
            desk.style.transform = `rotateY(${(16 * turn).toFixed(2)}deg) translate3d(${(-24 * open * reach).toFixed(1)}px, 0, ${(-50 * open).toFixed(1)}px)`;
            this.phone().nativeElement.style.transform = `rotateY(${(-16 * turn).toFixed(2)}deg) translate3d(0, ${(-22 * open).toFixed(1)}px, ${(80 * open).toFixed(1)}px)`;
          } else {
            // Phone alone: it turns to face the visitor and rises a little.
            this.phone().nativeElement.style.transform = `rotateY(${(-20 * turn).toFixed(2)}deg) translate3d(0, ${(-16 * open).toFixed(1)}px, 0)`;
          }
        },
      },
      inject(DestroyRef),
    );
  }
}
