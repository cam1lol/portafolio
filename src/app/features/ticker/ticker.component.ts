import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CollectionsService } from '../../core/data/collections.service';

const DEFAULT_TECHNOLOGIES: readonly string[] = [
  'Angular',
  'TypeScript',
  'Three.js',
  'Blender',
  'Java',
  'Spring Boot',
  'Node.js',
  'Vue 3',
  'Ionic',
  'AWS',
  'Python',
  'FastAPI',
];

@Component({
  selector: 'app-ticker',
  standalone: true,
  templateUrl: './ticker.component.html',
  styleUrl: './ticker.component.css',
})

export class TickerComponent implements AfterViewInit {
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly rows = toSignal(
    inject(CollectionsService).getPublished('ticker_items'),
    { initialValue: null },
  );

  readonly technologies = computed<readonly string[]>(() => {
    const rows = this.rows();

    if (!rows) {
      return DEFAULT_TECHNOLOGIES;
    }

    const items = rows
      .map((row) => String(row['label'] ?? '').trim())
      .filter((label) => label.length > 0);

    return items.length > 0 ? items : DEFAULT_TECHNOLOGIES;
  });

  /**
   * Scrolling speeds the strip up (scrolling up runs it backwards) and it eases back to normal,
   * like the background rings. playbackRate keeps the position, so there is no jump; the loop only
   * runs while the speed is settling.
   */
  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Looked up once (getAnimations forces a style update); again only if the strip was re-rendered.
    let cached: Animation[] = [];
    const animations = () => (cached.length && cached[0].playState !== 'idle' ? cached : (cached = this.track().nativeElement.getAnimations()));
    let lastY = window.scrollY;
    let lastT = performance.now();
    let rate = 1;
    let frame = 0;

    this.zone.runOutsideAngular(() => {
      const settle = () => {
        rate += (1 - rate) * 0.04;
        if (Math.abs(rate - 1) < 0.02) rate = 1;
        for (const animation of animations()) animation.playbackRate = rate;
        frame = rate === 1 ? 0 : requestAnimationFrame(settle);
      };
      const onScroll = () => {
        const now = performance.now();
        const dy = window.scrollY - lastY;
        const speed = Math.abs(dy) / Math.max(16, now - lastT); // px per ms
        lastY = window.scrollY;
        lastT = now;
        const target = Math.sign(dy || 1) * (1 + Math.min(speed * 4, 6));
        rate += (target - rate) * 0.3;
        if (!frame) frame = requestAnimationFrame(settle);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(frame);
      });
    });
  }
}
