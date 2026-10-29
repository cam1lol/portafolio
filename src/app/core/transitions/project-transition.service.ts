import { Injectable, Injector, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

/** Profundidad de las pantallas de proyecto: inicio 0, /proyectos 1, /proyectos/:slug 2. */
const DEPTH: Record<string, number> = { '': 0, proyectos: 1, 'proyectos/:slug': 2 };

/** Evento de ventana que escuchan los anillos del fondo: giran más rápido y lanzan un pulso (ring-layer.component). */
export const RING_BURST_EVENT = 'portfolio:ring-burst';

export type TransitionDirection = 'forward' | 'back';
export type SharedPart = 'card' | 'title' | 'media';

/**
 * Coordina el paso animado entre la tarjeta de un proyecto (inicio, modal, /proyectos) y su página con
 * la View Transitions API (`withViewTransitions` del router, más `startViewTransition` para el modal
 * del inicio). La tarjeta activa, el modal y la página comparten tres nombres (`project-card`,
 * `project-title`, `project-media`) y el navegador transforma uno en otro. styles.css añade la
 * apertura circular desde el clic, el marco HUD y el deslizamiento en móvil.
 */
@Injectable({ providedIn: 'root' })
export class ProjectTransitionService {
  private readonly injector = inject(Injector);

  /** Proyecto cuya tarjeta lleva los nombres compartidos: el que se acaba de abrir o del que se vuelve. */
  readonly activeSlug = signal<string | null>(null);
  /** Rótulo HUD en el centro de la pantalla mientras se abre un proyecto ("PROYECTO 03 // NOMBRE"). */
  readonly interstitial = signal<{ index: string; name: string } | null>(null);
  /** True mientras corre una transición de proyecto; el título de la página la espera antes de su efecto de descifrado. */
  readonly transitioning = signal(false);

  /** Lo activa el gesto de deslizar para volver: la página ya se fue con el dedo, así que se salta la siguiente animación. */
  private skipNext = false;
  /** El navegador (p. ej. el gesto de borde de iOS) ya animó este paso del historial. */
  private uaAnimatedPop = false;

  constructor() {
    window.addEventListener('popstate', (event) => {
      this.uaAnimatedPop = !!(event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    });
    // El círculo se abre desde el último clic o toque (con teclado: el centro del elemento enfocado).
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

  /** `view-transition-name` compartido, solo en la tarjeta del proyecto activo (los nombres deben ser únicos en la página). */
  name(slug: string, part: SharedPart): string | null {
    return this.activeSlug() === slug ? `project-${part}` : null;
  }

  /** Se eligió una tarjeta: lleva los nombres compartidos, y su nombre y número alimentan el rótulo HUD. */
  select(slug: string, name?: string, position?: number): void {
    this.activeSlug.set(slug);
    this.interstitial.set(name ? { index: String((position ?? 0) + 1).padStart(2, '0'), name } : null);
  }

  skipNextTransition(): void {
    this.skipNext = true;
  }

  /** Gancho del router (`withViewTransitions({ onViewTransitionCreated })`): solo anima navegaciones de proyecto. */
  onRouterTransition(info: ViewTransitionInfo): void {
    const from = leafPath(info.from);
    const to = leafPath(info.to);
    const skip =
      this.skipNext || this.uaAnimatedPop || !(from in DEPTH && to in DEPTH) || (from === to && from !== 'proyectos/:slug') ||
      document.documentElement.dataset['sceneTransition'] === 'none';
    this.skipNext = false;
    this.uaAnimatedPop = false;
    if (skip) {
      // No skipTransition(): Angular registra cada transición saltada como AbortError en desarrollo. Una
      // transición instantánea (sin animación, en styles.css) se ve igual y deja la consola limpia.
      const root = document.documentElement.classList;
      root.add('vt-instant');
      info.transition.finished.finally(() => root.remove('vt-instant'));
      return;
    }
    this.begin(`vt-${direction(from, to)}`, info.transition.finished);
  }

  /**
   * Ejecuta un cambio del DOM (abrir o cerrar el modal del inicio) como view transition, para que la
   * tarjeta crezca hasta el panel del modal. Sin la API, el cambio es instantáneo. Con movimiento
   * reducido styles.css convierte cada transición en un fundido corto.
   */
  run(change: () => void): void {
    const doc = document as Document & {
      startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void>; ready: Promise<void> };
    };
    if (!doc.startViewTransition) {
      change();
      return;
    }
    // El navegador toma la captura "vieja" en su siguiente fotograma, cuando Angular ya pintó los nombres
    // compartidos de la tarjeta; la "nueva" cuando Angular renderizó el cambio.
    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          change();
          afterNextRender(() => resolve(), { injector: this.injector });
          setTimeout(resolve, 300); // nunca dejar la página congelada esperando un render
        }),
    );
    transition.ready.catch(() => undefined);
    // Solo se transforman la tarjeta, el título y la imagen compartidos; sin deslizar la página (eso es para cambios de ruta).
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

/** Patrón de la ruta activa más profunda, p. ej. `proyectos/:slug`. */
export function leafPath(snapshot: ActivatedRouteSnapshot): string {
  let node = snapshot;
  while (node.firstChild) node = node.firstChild;
  return node.routeConfig?.path ?? '';
}

/** Pantalla más profunda = avanzar (entra deslizando); menos profunda = volver. De proyecto a proyecto cuenta como avanzar. */
export function direction(from: string, to: string): TransitionDirection {
  return (DEPTH[to] ?? 0) >= (DEPTH[from] ?? 0) ? 'forward' : 'back';
}
