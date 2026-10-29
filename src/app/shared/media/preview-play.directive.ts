import { AfterViewInit, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';

/**
 * Reproduce el clip de vista previa sin sonido mientras se pasa el ratón por su tarjeta o, en táctil,
 * mientras se ve casi entera; si no, lo pausa. Con prefers-reduced-motion nunca se reproduce solo: queda el póster.
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
    // play() falla si el navegador lo bloquea o falta el archivo; el póster sigue visible.
    this.video.play()?.catch(() => undefined);
  }

  private pause(): void {
    this.video.pause();
  }
}
