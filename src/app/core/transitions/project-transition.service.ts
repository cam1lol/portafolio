import { Injectable, Injector, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

/** Route depth of the project screens: home 0, /proyectos 1, /proyectos/:slug 2. */
const DEPTH: Record<string, number> = { '': 0, proyectos: 1, 'proyectos/:slug': 2 };

/** Window event the background rings listen to: spin faster and fire a pulse (ring-layer.component). */
export const RING_BURST_EVENT = 'portfolio:ring-burst';

export type TransitionDirection = 'forward' | 'back';
export type SharedPart = 'card' | 'title' | 'media';

/**
 * Coordinates the animated move between a project card (home, modal, /proyectos) and its page,
 * using the View Transitions API (router `withViewTransitions`, plus `startViewTransition` for the
 * home modal). The active card, the modal and the page share three names (`project-card`,
 * `project-title`, `project-media`): the browser morphs one into the other. styles.css adds the
 * circular reveal from the click point, the HUD frame and the phone slide.
 */
@Injectable({ providedIn: 'root' })
export class ProjectTransitionService {
  private readonly injector = inject(Injector);

  /** Project whose card should carry the shared names: the one just opened, or the one we come back from. */
  readonly activeSlug = signal<string | null>(null);
  /** HUD label shown in the middle of the screen while a project opens ("PROYECTO 03 // NAME"). */
  readonly interstitial = signal<{ index: string; name: string } | null>(null);
  /** True while a project transition runs; the page title waits for it before its decode effect. */
  readonly transitioning = signal(false);

  /** Set by the swipe-back gesture: the page already slid away with the finger, so skip the next animation. */
  private skipNext = false;
  /** The browser (e.g. iOS edge swipe) already animated this history step. */
  private uaAnimatedPop = false;

  constructor() {
    window.addEventListener('popstate', (event) => {
      this.uaAnimatedPop = !!(event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    });
    // The reveal circle opens from the last click or tap (keyboard: the focused element's center).
    const root = document.documentElement;
    const origin = (x: number, y: number) => {
      root.style.setProperty('--vt-x', `${Math.round(x)}px`);
      root.style.setProperty('--vt-y', `${Math.round(y)}px`);
    };
    document.addEventListener('pointerdown', (event) => origin(event.clientX, event.clientY), { capture: true, passive: true });
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const rect = (event.target as HTMLElement).getBoundingClientRect?.();
        if (rect) origin(rect.left + rect.width / 2, rect.top + rect.height / 2);
      },
      { capture: true },
    );
  }

  /** Shared `view-transition-name`, only on the active project's card (names must be unique on a page). */
  name(slug: string, part: SharedPart): string | null {
    return this.activeSlug() === slug ? `project-${part}` : null;
  }

  /** A card was chosen: it carries the shared names, and its name/number feed the HUD label. */
  select(slug: string, name?: string, position?: number): void {
    this.activeSlug.set(slug);
    this.interstitial.set(name ? { index: String((position ?? 0) + 1).padStart(2, '0'), name } : null);
  }

  skipNextTransition(): void {
    this.skipNext = true;
  }

  /** Router hook (`withViewTransitions({ onViewTransitionCreated })`): animate only project navigations. */
  onRouterTransition(info: ViewTransitionInfo): void {
    const from = leafPath(info.from);
    const to = leafPath(info.to);
    const skip =
      this.skipNext || this.uaAnimatedPop || !(from in DEPTH && to in DEPTH) || (from === to && from !== 'proyectos/:slug');
    this.skipNext = false;
    this.uaAnimatedPop = false;
    if (skip) {
      // Not skipTransition(): Angular logs every skipped transition as an AbortError in dev mode.
      // An instant transition (no animation, styles.css) looks the same and keeps the console clean.
      const root = document.documentElement.classList;
      root.add('vt-instant');
      info.transition.finished.finally(() => root.remove('vt-instant'));
      return;
    }
    this.begin(`vt-${direction(from, to)}`, info.transition.finished);
  }

  /**
   * Runs a DOM change (opening or closing the home modal) as a view transition, so the card grows
   * into the modal panel. Falls back to an instant change without the API. With reduced motion
   * styles.css turns every transition into a short fade.
   */
  run(change: () => void): void {
    const doc = document as Document & {
      startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void>; ready: Promise<void> };
    };
    if (!doc.startViewTransition) {
      change();
      return;
    }
    // The browser takes the "old" snapshot on its next frame, after Angular has painted the card's
    // shared names; the "new" one once Angular has rendered the change.
    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          change();
          afterNextRender(() => resolve(), { injector: this.injector });
          setTimeout(resolve, 300); // never leave the page frozen waiting for a render
        }),
    );
    transition.ready.catch(() => undefined);
    // Only the shared card / title / media morph; no page slide (that is for route changes).
    this.begin('vt-modal', transition.finished);
  }

  private begin(className: string, finished: Promise<void>): void {
    const root = document.documentElement.classList;
    root.add(className);
    this.transitioning.set(true);
    window.dispatchEvent(new Event(RING_BURST_EVENT));
    finished.finally(() => {
      root.remove(className);
      this.transitioning.set(false);
      this.interstitial.set(null);
    });
  }
}

/** Path pattern of the deepest active route, e.g. `proyectos/:slug`. */
export function leafPath(snapshot: ActivatedRouteSnapshot): string {
  let node = snapshot;
  while (node.firstChild) node = node.firstChild;
  return node.routeConfig?.path ?? '';
}

/** Deeper screen = forward (slide in); shallower = back. Project to project counts as forward. */
export function direction(from: string, to: string): TransitionDirection {
  return (DEPTH[to] ?? 0) >= (DEPTH[from] ?? 0) ? 'forward' : 'back';
}
