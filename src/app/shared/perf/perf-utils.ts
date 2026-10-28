/**
 * Small building blocks so every new effect is fluid by construction (AGENTS.md, 8.1). Callers
 * run them outside Angular (NgZone.runOutsideAngular) when the work only touches the DOM.
 */

/**
 * Calls `onChange(true/false)` as the element enters or leaves the screen (with `margin` of slack),
 * to pause loops, videos or WebGL while they are not visible. Returns a function that stops it.
 */
export function whenVisible(element: Element, onChange: (visible: boolean) => void, margin = '0px'): () => void {
  if (!('IntersectionObserver' in window)) {
    onChange(true);
    return () => undefined;
  }
  const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin: margin });
  observer.observe(element);
  return () => observer.disconnect();
}

export interface IdleLoop {
  /** Starts the loop if it is asleep (cheap to call on every input event). */
  wake(): void;
  /** Stops it for good (component destroyed). */
  stop(): void;
}

/**
 * An animation-frame loop that sleeps by itself: `step(now, dt)` returns true while there is still
 * something moving and false once everything has settled; the loop then costs nothing until
 * `wake()` is called again (from a scroll, a pointer move, a timer...).
 */
export function idleLoop(step: (now: number, dt: number) => boolean): IdleLoop {
  let frameId = 0;
  let last = 0;
  let stopped = false;
  const frame = (now: number) => {
    const dt = Math.min(64, now - last);
    last = now;
    frameId = !stopped && step(now, dt) ? requestAnimationFrame(frame) : 0;
  };
  return {
    wake() {
      if (frameId || stopped) return;
      last = performance.now();
      frameId = requestAnimationFrame(frame);
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(frameId);
      frameId = 0;
    },
  };
}

/** True when effects should be reduced: the visitor asked for less motion, or the device is modest. */
export function prefersLightEffects(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('fx-lite');
}
