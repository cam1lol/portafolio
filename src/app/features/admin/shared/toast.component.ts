import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.items(); track toast.id) {
        <div class="toast mono" [class.error]="toast.kind === 'error'">
          <span>{{ toast.message }}</span>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts { position: fixed; right: 20px; bottom: 20px; z-index: 950; display: grid; gap: 8px; max-width: min(380px, calc(100vw - 40px)); }
    .toast {
      display: flex; align-items: center; gap: 12px; padding: 11px 12px 11px 14px;
      border: 1px solid var(--line); border-left: 2px solid var(--good); border-radius: var(--r);
      background: var(--graphite-2); color: var(--bone); font-size: 11px; letter-spacing: .06em;
      box-shadow: 0 10px 30px -12px rgba(0, 0, 0, .6); animation: toast-in .2s ease-out;
    }
    .toast.error { border-left-color: var(--ember); }
    .toast span { flex: 1; }
    .toast button { display: inline-flex; padding: 2px; border: 0; background: none; color: var(--steel); cursor: pointer; }
    .toast button svg { width: 14px; height: 14px; }
    .toast button:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `,
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
