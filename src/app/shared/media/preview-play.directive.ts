import { AfterViewInit, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';

/**
 * Plays a muted preview clip while its card is hovered (mouse) or mostly visible (touch),
 * and pauses it otherwise. Never autoplays for prefers-reduced-motion: the poster stays.
 */
@Directive({
  selector: 'video[appPreviewPlay]',
  standalone: true,
})
export class PreviewPlayDirective implements AfterViewInit {
  private readonly video = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.video.muted = true;

    this.zone.runOutsideAngular(() => {
      if (window.matchMedia('(pointer: fine)').matches) {
        const card = this.video.closest<HTMLElement>('.card') ?? this.video;
        const enter = () => this.play();
        const leave = () => this.pause();
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

      const observer = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? this.play() : this.pause()),
        { threshold: 0.6 },
      );
      observer.observe(this.video);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private play(): void {
    // play() rejects if the browser blocks it or the source is missing; the poster stays visible.
    this.video.play()?.catch(() => undefined);
  }

  private pause(): void {
    this.video.pause();
  }
}
