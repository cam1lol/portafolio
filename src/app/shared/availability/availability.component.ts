import { Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SiteContentService } from '../../core/data/site-content.service';

export type AvailabilityState = 'open' | 'limited' | 'closed';
const STATES: AvailabilityState[] = ['open', 'limited', 'closed'];

/**
 * Píldora "Disponible desde noviembre" con un punto de estado; se edita en Textos del sitio >
 * Disponibilidad (claves availability_state y availability_text de site_content). Se oculta si el
 * estado es "hidden" o el texto está vacío.
 */
@Component({
  selector: 'app-availability',
  standalone: true,
  template: `
    @if (state(); as s) {
      <p class="avail mono" [attr.data-state]="s">
        <span class="dot" aria-hidden="true"></span>
        {{ text() }}
      </p>
    }
  `,
  styles: `
    :host { display: block; }
    .avail {
      display: inline-flex; align-items: center; gap: 10px; margin: 0; padding: 7px 14px 7px 12px;
      border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--graphite) 80%, transparent);
      color: var(--bone); font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
    }
    .dot { position: relative; width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--steel); }
    [data-state='open'] .dot { background: var(--good); }
    [data-state='limited'] .dot { background: var(--ember); }
    /* Solo "disponible" late: el único estado que invita a actuar. */
    [data-state='open'] .dot::after {
      content: ''; position: absolute; inset: 0; border-radius: 50%; background: var(--good);
      animation: avail-pulse 2s ease-out infinite;
    }
    @keyframes avail-pulse { from { opacity: .7; transform: scale(1); } to { opacity: 0; transform: scale(2.8); } }
    @media (prefers-reduced-motion: reduce) { [data-state='open'] .dot::after { animation: none; display: none; } }
  `,
})
export class AvailabilityComponent {
  private readonly content = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.content.ensureLoaded();
  }

  protected readonly text = computed(() => this.content.valueFor('availability_text', this.transloco.activeLang()));

  /** Estado a mostrar, o null si la píldora está oculta. */
  protected readonly state = computed<AvailabilityState | null>(() => {
    const state = this.content.valueFor('availability_state', 'es') as AvailabilityState;
    return STATES.includes(state) && this.text() ? state : null;
  });
}
