/**
 * Piezas pequeñas para que cada efecto nuevo sea fluido desde el principio (AGENTS.md, 8.1).
 * Quien las usa las ejecuta fuera de Angular (NgZone.runOutsideAngular) si solo tocan el DOM.
 */

/**
 * Llama a `onChange(true/false)` cuando el elemento entra o sale de la pantalla (con `margin` de
 * holgura), para pausar bucles, videos o WebGL que no se ven. Devuelve la función que lo detiene.
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
  /** Arranca el bucle si está dormido (barato de llamar en cada evento). */
  wake(): void;
  /** Lo detiene del todo (componente destruido). */
  stop(): void;
}

/**
 * Bucle de requestAnimationFrame que se duerme solo: `step(now, dt)` devuelve true mientras algo se
 * mueve y false cuando todo se asentó; desde ahí no cuesta nada hasta que se llame a `wake()`
 * (desde un scroll, un movimiento del puntero, un temporizador...).
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

/** True si hay que reducir efectos: el visitante pidió menos movimiento o el equipo es modesto. */
export function prefersLightEffects(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('fx-lite');
}
