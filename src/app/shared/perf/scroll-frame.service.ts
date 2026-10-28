import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';

/** What every scroll-driven task receives once per frame. */
export interface ScrollFrame {
  /** Read in the scroll event (layout is clean there), so reading it never forces a layout. */
  scrollY: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ScrollTask<T> {
  /** Measure phase: getBoundingClientRect, offsetHeight... No DOM writes here. */
  read?: (frame: ScrollFrame) => T;
  /** Write phase: runs after every task has measured, so writes never interleave with reads. */
  write: (measured: T, frame: ScrollFrame) => void;
}

/**
 * One shared scroll/resize listener for the whole app (outside Angular). On scroll it schedules a
 * single animation frame in which every registered task first measures and then writes, so N
 * components cost one layout per frame instead of N forced layouts. Writes should still compare
 * with the last value and skip unchanged ones (see AGENTS.md, 8.1).
 */
@Injectable({ providedIn: 'root' })
export class ScrollFrameService {
  private readonly zone = inject(NgZone);
  private readonly tasks = new Set<ScrollTask<unknown>>();
  private frameId = 0;
  private listening = false;
  private scrollY = 0;

  private readonly onScroll = () => {
    this.scrollY = window.scrollY;
    this.request();
  };

  /**
   * Registers a task; it runs once right away and then on every scroll/resize frame. Pass a
   * DestroyRef to unregister automatically; the returned function also unregisters.
   */
  register<T>(task: ScrollTask<T>, destroyRef?: DestroyRef): () => void {
    this.tasks.add(task as ScrollTask<unknown>);
    this.listen();
    this.request();
    const off = () => {
      this.tasks.delete(task as ScrollTask<unknown>);
      if (!this.tasks.size) this.unlisten();
    };
    destroyRef?.onDestroy(off);
    return off;
  }

  /** Asks for a frame without scrolling (content changed, a section appeared...). */
  request(): void {
    if (this.frameId || !this.tasks.size) return;
    this.frameId = this.zone.runOutsideAngular(() => requestAnimationFrame(() => this.run()));
  }

  private run(): void {
    this.frameId = 0;
    const frame: ScrollFrame = { scrollY: this.scrollY, viewportHeight: window.innerHeight, viewportWidth: window.innerWidth };
    const tasks = [...this.tasks];
    const measured = tasks.map((task) => task.read?.(frame));
    tasks.forEach((task, i) => task.write(measured[i], frame));
  }

  private listen(): void {
    if (this.listening) return;
    this.listening = true;
    this.scrollY = window.scrollY;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
  }

  private unlisten(): void {
    this.listening = false;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }
}
