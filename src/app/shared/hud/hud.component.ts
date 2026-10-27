import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

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

  ngAfterViewInit(): void {
    const bar = this.progress().nativeElement;
    const index = this.index().nativeElement;
    let scheduled = false;

    const update = () => {
      scheduled = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0})`;

      const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]')).filter((s) => s.offsetHeight > 0);
      const line = window.innerHeight * 0.4;
      let current = -1;
      sections.forEach((section, i) => {
        if (section.getBoundingClientRect().top <= line) current = i;
      });
      if (current < 0 || !sections.length) {
        index.textContent = '';
        return;
      }
      const heading = sections[current].querySelector('h2, h1');
      const label = (heading?.getAttribute('aria-label') || (heading as HTMLElement | null)?.innerText || sections[current].id).trim().replace(/\s+/g, ' ');
      const pad = (n: number) => String(n).padStart(2, '0');
      index.textContent = `${pad(current + 1)} / ${pad(sections.length)} · ${label.slice(0, 24).toUpperCase()}`;
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      // New page or late content (data, deferred sections): recompute.
      const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => setTimeout(schedule, 50));
      const interval = setInterval(schedule, 2000);
      schedule();
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        sub.unsubscribe();
        clearInterval(interval);
      });
    });
  }
}
