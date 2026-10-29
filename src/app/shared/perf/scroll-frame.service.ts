import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';

/** Lo que recibe cada tarea de scroll una vez por fotograma. */
export interface ScrollFrame {
  /** Se lee en el propio evento de scroll (ahí el layout está limpio), así que leerlo nunca fuerza un layout. */
  scrollY: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ScrollTask<T> {
  /** Fase de medida: getBoundingClientRect, offsetHeight... Aquí no se escribe en el DOM. */
  read?: (frame: ScrollFrame) => T;
  /** Fase de escritura: corre cuando todas las tareas ya midieron, así lecturas y escrituras no se mezclan. */
  write: (measured: T, frame: ScrollFrame) => void;
}

/**
 * Un único listener de scroll/resize para toda la app (fuera de Angular). En cada scroll pide un solo
 * fotograma en el que todas las tareas registradas primero miden y luego escriben: N componentes
 * cuestan un layout por fotograma en vez de N layouts forzados. Cada escritura debe compararse con
 * el último valor y saltarse si no cambió (AGENTS.md, 8.1).
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
   * Registra una tarea: se ejecuta una vez al momento y luego en cada fotograma de scroll/resize. Con un
   * DestroyRef se da de baja sola; la función que devuelve también la da de baja.
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

  /** Pide un fotograma sin que haya scroll (cambió el contenido, apareció una sección...). */
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
