import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ca-sound';

/**
 * Sonidos de interfaz opcionales, apagados por defecto (botón en la cabecera y Ctrl+K). Sintetizados
 * con la Web Audio API: no hay archivos de audio. El AudioContext se crea con el primer sonido tras
 * activarlo, que siempre llega justo después de un clic (reglas de autoplay del navegador).
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly enabled = signal(this.read());
  private ctx: AudioContext | null = null;
  private lastTick = 0;

  /** Valor por defecto del admin (Escena); solo se usa mientras el visitante no haya tocado el sonido. */
  applyDefault(on: boolean): void {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== null) return;
    } catch {}
    this.enabled.set(on);
  }

  toggle(): void {
    const next = !this.enabled();
    this.enabled.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* almacenamiento bloqueado: la elección dura solo esta visita */
    }
    if (next) this.click();
  }

  /** Pasar sobre un enlace, botón o tarjeta: un pitido agudo muy corto (limitado en frecuencia). */
  tick(): void {
    const now = performance.now();
    if (now - this.lastTick < 60) return;
    this.lastTick = now;
    this.tone(1900, 0.025, 0.035, 'sine');
  }

  /** Pulsar algo. */
  click(): void {
    this.tone(620, 0.06, 0.07, 'triangle');
  }

  /** Transición de página o modal: un barrido suave ascendente. */
  whoosh(): void {
    this.sweep(180, 720, 0.32, 0.05);
  }

  /** Easter egg: un acorde grave. */
  ritual(): void {
    [110, 164.8, 220].forEach((freq, i) => this.tone(freq, 1.6, 0.06, 'sawtooth', i * 0.08));
  }

  private read(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private context(): AudioContext | null {
    if (!this.enabled()) return null;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, duration: number, volume: number, type: OscillatorType, delay = 0): void {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private sweep(from: number, to: number, duration: number, volume: number): void {
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
