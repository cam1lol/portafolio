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
   * El scroll acelera la franja (hacia arriba la hace ir al revés) y luego vuelve despacio a lo normal,
   * como los anillos del fondo. playbackRate conserva la posición, sin saltos; el bucle solo corre
   * mientras la velocidad se asienta.
   */
  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Se busca una vez (getAnimations fuerza un recálculo de estilos); otra vez solo si la franja se volvió a pintar.
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
        const speed = Math.abs(dy) / Math.max(16, now - lastT); // px por ms
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
