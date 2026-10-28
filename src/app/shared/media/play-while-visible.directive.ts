import { AfterViewInit, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';
import { prefersLightEffects, whenVisible } from '../perf/perf-utils';

/**
 * Loops a muted clip only while it is on screen (half visible) and pauses it otherwise, so a grid
 * of clips never decodes more than what is visible. With reduced motion or the light mode it does
 * not autoplay: the clip plays while its card is hovered or focused, and the poster stays otherwise.
 */
@Directive({
  selector: 'video[appPlayWhileVisible]',
  standalone: true,
})
export class PlayWhileVisibleDirective implements AfterViewInit {
  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.video.muted = true;
    this.zone.runOutsideAngular(() => {
      if (prefersLightEffects()) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const card = this.video.closest<HTMLElement>('.card') ?? this.video;
        const enter = () => this.play();
        const leave = () => this.video.pause();
        card.addEventListener('mouseenter', enter);
        card.addEventListener('mouseleave', leave);
        card.addEventListener('focusin', enter);
        card.addEventListener('focusout', leave);
        this.destroyRef.onDestroy(() => {
          card.removeEventListener('mouseenter', enter);
          card.removeEventListener('mouseleave', leave);
          card.removeEventListener('focusin', enter);
          card.removeEventListener('focusout', leave);
        });
        return;
      }
      const stop = whenVisible(this.video, (visible) => (visible ? this.play() : this.video.pause()), '-25% 0px');
      this.destroyRef.onDestroy(stop);
    });
  }

  private play(): void {
    // Rejected when the browser blocks it or the file is missing: the poster stays visible.
    this.video.play()?.catch(() => undefined);
  }
}
