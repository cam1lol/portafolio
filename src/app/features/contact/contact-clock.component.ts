import { Component, DestroyRef, NgZone, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

/** Bogotá está en UTC-5 todo el año (sin horario de verano). */
const BOGOTA_OFFSET_MIN = -5 * 60;

/** Horas que Bogotá va por delante (+) o por detrás (-) de un visitante con desfase UTC `visitorOffsetMin`. */
export function hoursFromVisitor(visitorOffsetMin: number): number {
  return (BOGOTA_OFFSET_MIN - visitorOffsetMin) / 60;
}

/**
 * Hora local de Bogotá en vivo junto al botón de contacto ("BOGOTÁ 14:32 · UTC-5"), más la diferencia
 * con la zona horaria del visitante. Se actualiza una vez por minuto, al cambiar el minuto.
 */
@Component({
  selector: 'app-contact-clock',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <p class="clock mono">
      <span class="k">{{ 'ct_clock_city' | transloco }}</span>
      <time [attr.datetime]="iso()">{{ time() }}</time>
      <span class="k">UTC-5</span>
      @if (diffKey(); as key) { <span class="diff">· {{ key | transloco: { n: diffHours() } }}</span> }
    </p>
  `,
  styles: `
    :host { display: block; }
    .clock { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; margin: 0; color: var(--bone); font-size: 11px; letter-spacing: .1em; }
    .k { color: var(--steel); }
    time { color: var(--bone); font-variant-numeric: tabular-nums; }
    .diff { color: var(--steel); text-transform: uppercase; }
  `,
})
export class ContactClockComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly now = signal(new Date());

  protected readonly time = computed(() =>
    this.now().toLocaleTimeString(this.transloco.activeLang() === 'en' ? 'en-US' : 'es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
  );
  protected readonly iso = computed(() => this.now().toISOString());

  private readonly diff = computed(() => hoursFromVisitor(-this.now().getTimezoneOffset()));
  protected readonly diffHours = computed(() => Math.abs(this.diff()));
  /** Misma zona horaria: nada que añadir. */
  protected readonly diffKey = computed(() => {
    const diff = this.diff();
    if (!diff) return null;
    if (Math.abs(diff) === 1) return diff > 0 ? 'ct_clock_ahead_one' : 'ct_clock_behind_one';
    return diff > 0 ? 'ct_clock_ahead' : 'ct_clock_behind';
  });

  constructor() {
    const zone = inject(NgZone);
    let timer = 0;
    const tick = () => {
      const now = new Date();
      // Vuelve a la zona de Angular solo para actualizar el texto; la espera corre fuera.
      zone.run(() => this.now.set(now));
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    zone.runOutsideAngular(() => (timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)));
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
