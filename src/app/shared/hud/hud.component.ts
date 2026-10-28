import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { RITUAL_EVENT } from '../../core/background/ring-layer.component';

/**
 * Fixed HUD layer: corner ticks, a scroll progress line under the header and, on the home page,
 * the index of the section in view ("03 / 09 · EXPERIENCIA"). The index is read from the page
 * (`main section[id]` and its heading), so it follows hidden or reordered sections.
 */
@Component({
  selector: 'app-hud',
  standalone: true,
  templateUrl: './hud.component.html',
  styleUrl: './hud.component.css',
})
export class HudComponent implements AfterViewInit {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly progress = viewChild.required<ElementRef<HTMLElement>>('progress');
  private readonly index = viewChild.required<ElementRef<HTMLElement>>('index');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly isAdmin = computed(() => this.url().startsWith('/admin'));
  protected readonly isHome = computed(() => this.url().split(/[?#]/)[0] === '/');
  /** Easter egg label, shown while the rings run their ritual. */
  protected readonly ritual = signal(false);

  ngAfterViewInit(): void {
    const bar = this.progress().nativeElement;
    const index = this.index().nativeElement;
    let scheduled = false;
    // The section list is re-read on navigation, resize and every 2 s (late content), not on every
    // scroll frame. A frame only reads positions first and then writes, and writes only what changed,
    // so it never forces an extra layout or re-shapes the label text while scrolling.
    let sections: HTMLElement[] = [];
    let stale = true;
    let lastScale = '';
    let lastIndex = -2;

    const update = () => {
      scheduled = false;
      if (stale) {
        sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]')).filter((s) => s.offsetHeight > 0);
        stale = false;
        lastIndex = -2;
      }
      // Reads.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const scale = max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0';
      const line = window.innerHeight * 0.4;
      let current = -1;
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) current = i;
        else break;
      }
      // Writes.
      if (scale !== lastScale) {
        lastScale = scale;
        bar.style.transform = `scaleX(${scale})`;
      }
      if (current === lastIndex) return;
      lastIndex = current;
      if (current < 0) {
        index.textContent = '';
        return;
      }
      const heading = sections[current].querySelector('h2, h1');
      const label = (heading?.getAttribute('aria-label') || (heading as HTMLElement | null)?.innerText || sections[current].id).trim().replace(/s+/g, ' ');
      const pad = (n: number) => String(n).padStart(2, '0');
      index.textContent = `${pad(current + 1)} / ${pad(sections.length)} · ${label.slice(0, 24).toUpperCase()}`;
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    const refresh = () => {
      stale = true;
      schedule();
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', refresh, { passive: true });
      // New page or late content (data, deferred sections): recompute.
      const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => setTimeout(refresh, 50));
      const interval = setInterval(refresh, 2000);
      let ritualTimer: ReturnType<typeof setTimeout> | undefined;
      const onRitual = () => this.zone.run(() => {
        this.ritual.set(true);
        clearTimeout(ritualTimer);
        ritualTimer = setTimeout(() => this.zone.run(() => this.ritual.set(false)), 3800);
      });
      window.addEventListener(RITUAL_EVENT, onRitual);
      schedule();
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', refresh);
        sub.unsubscribe();
        clearInterval(interval);
        clearTimeout(ritualTimer);
        window.removeEventListener(RITUAL_EVENT, onRitual);
      });
    });
  }
}
