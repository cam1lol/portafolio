import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'ok' | 'error';
}

const DURATION_MS = 3500;

/** Mensajes cortos de confirmación del admin ("Guardado", "Eliminado"), los muestra ToastComponent. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly items = signal<Toast[]>([]);

  show(message: string, kind: Toast['kind'] = 'ok'): void {
    const toast: Toast = { id: this.nextId++, message, kind };
    this.items.update((items) => [...items, toast]);
    setTimeout(() => this.dismiss(toast.id), DURATION_MS);
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((toast) => toast.id !== id));
  }
}
