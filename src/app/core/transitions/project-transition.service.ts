import { Injectable, Injector, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

/** Route depth of the project screens: home 0, /proyectos 1, /proyectos/:slug 2. */
const DEPTH: Record<string, number> = { '': 0, proyectos: 1, 'proyectos/:slug': 2 };

export type TransitionDirection = 'forward' | 'back';

/**
 * Coordinates the animated move between a project card (home, modal, /proyectos) and its page,
 * using the View Transitions API (router `withViewTransitions`, plus `startViewTransition` for the
 * home modal). The card, modal and page title / media share a `view-transition-name` built from the
 * slug, so the browser morphs one into the other; the rest of the page slides (styles.css).
 */
@Injectable({ providedIn: 'root' })
export class ProjectTransitionService {
  private readonly injector = inject(Injector);

  /** Project whose card should carry the shared names: the one just opened, or the one we come back from. */
  readonly activeSlug = signal<string | null>(null);

  /** Set by the swipe-back gesture: the page already slid away with the finger, so skip the next animation. */
  private skipNext = false;
  /** The browser (e.g. iOS edge swipe) already animated this history step. */
  private uaAnimatedPop = false;

  constructor() {
    window.addEventListener('popstate', (event) => {
      this.uaAnimatedPop = !!(event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    });
  }

  /** `view-transition-name` for one part of a project, only on the active project (names must be unique). */
  name(slug: string, part: 'title' | 'media'): string | null {
    return this.activeSlug() === slug ? `project-${part}-${slug}` : null;
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
      info.transition.skipTransition();
      return;
    }
    this.markDirection(direction(from, to), info.transition.finished);
  }

  /**
   * Runs a DOM change (opening or closing the home modal) as a view transition, so the card title
   * morphs into the modal title. Falls back to an instant change without the API. With reduced motion
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
    // Only the shared title/media morph; no page slide (that is for route changes).
    document.documentElement.classList.add('vt-modal');
    transition.finished.finally(() => document.documentElement.classList.remove('vt-modal'));
  }

  private markDirection(dir: TransitionDirection, finished: Promise<void>): void {
    const root = document.documentElement.classList;
    root.add(`vt-${dir}`);
    finished.finally(() => root.remove(`vt-${dir}`));
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

