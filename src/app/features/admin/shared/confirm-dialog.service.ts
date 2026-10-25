import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (confirmed: boolean) => void;
}

/** Admin-only replacement for `window.confirm()`, rendered by `ConfirmDialogComponent` in the admin layout. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly state = signal<ConfirmState | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.state()?.resolve(false);
    return new Promise((resolve) => {
      this.state.set({ confirmLabel: 'ELIMINAR', ...options, resolve });
    });
  }

  close(confirmed: boolean): void {
    const current = this.state();
    if (!current) return;
    this.state.set(null);
    current.resolve(confirmed);
  }
}
