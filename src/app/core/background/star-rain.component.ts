import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, inject, viewChild } from '@angular/core';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number; // 0..1, fades in and out
  speed: number; // life consumed per ms
  ember: boolean;
}

/** Fall direction: steep diagonal, top-right to bottom-left (degrees from the x axis). */
const ANGLE = (115 * Math.PI) / 180;

/**
 * Sparse "data rain": thin diagonal meteors with a fading tail, between the rings and the content.
 * Cheap on purpose: the canvas only animates while a meteor is on screen, a few at a time (at most
 * two on phones), paused in background tabs, and absent with reduced motion.
 */
@Component({
  selector: 'app-star-rain',
  standalone: true,
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: `
    :host { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    canvas { display: block; width: 100%; height: 100%; }
    :host-context([data-theme='day']) canvas { opacity: .45; }
  `,
})
export class StarRainComponent implements AfterViewInit {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private meteors: Meteor[] = [];
  private frame = 0;
  private spawnTimer: ReturnType<typeof setTimeout> | undefined;
  private last = 0;

  ngAfterViewInit(): void {
    // No rain with reduced motion or on modest hardware (fx-lite, see main.ts).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('fx-lite')) return;
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.zone.runOutsideAngular(() => {
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);

      const phone = window.matchMedia('(max-width: 760px)').matches;
      const schedule = () => {
        const wait = 1600 + Math.random() * 2800;
        this.spawnTimer = setTimeout(() => {
          // Not during a page transition: the browser is busy enough animating the snapshots.
          const transitioning = /vt-(forward|back|modal)/.test(document.documentElement.className);
          if (!document.hidden && !transitioning) {
            const count = 1 + Math.floor(Math.random() * (phone ? 2 : 3));
            for (let i = 0; i < count; i++) this.meteors.push(this.newMeteor(i * 140));
            this.start(ctx);
          }
          schedule();
        }, wait);
      };
      schedule();

      this.destroyRef.onDestroy(() => {
        clearTimeout(this.spawnTimer);
        cancelAnimationFrame(this.frame);
        window.removeEventListener('resize', resize);
      });
    });
  }

  private newMeteor(delayPx: number): Meteor {
    const speed = 0.55 + Math.random() * 0.6; // px per ms
    return {
      // Start above the top edge, anywhere across (biased right, since they travel left).
      x: window.innerWidth * (0.15 + Math.random() * 1.0) + delayPx,
      y: -40 - Math.random() * window.innerHeight * 0.3,
      vx: Math.cos(ANGLE) * speed,
      vy: Math.sin(ANGLE) * speed,
      length: 70 + Math.random() * 120,
      life: 0,
      speed: 1 / (1400 + Math.random() * 900),
      ember: Math.random() < 0.35,
    };
  }

  /** Runs the loop only while there is something to draw. */
  private start(ctx: CanvasRenderingContext2D): void {
    if (this.frame) return;
    this.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(48, now - this.last);
      this.last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      this.meteors = this.meteors.filter((m) => m.life < 1);
      for (const m of this.meteors) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life += m.speed * dt;
        this.draw(ctx, m);
      }
      if (this.meteors.length) {
        this.frame = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.frame = 0;
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  private draw(ctx: CanvasRenderingContext2D, m: Meteor): void {
    // Fade in quickly, hold, fade out.
    const alpha = m.life < 0.15 ? m.life / 0.15 : m.life > 0.7 ? (1 - m.life) / 0.3 : 1;
    const tailX = m.x - Math.cos(ANGLE) * m.length;
    const tailY = m.y - Math.sin(ANGLE) * m.length;
    const head = m.ember ? '242, 84, 27' : '233, 234, 237';
    const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
    gradient.addColorStop(0, `rgba(${head}, ${0.9 * alpha})`);
    gradient.addColorStop(1, `rgba(${head}, 0)`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    // Bright head.
    ctx.fillStyle = `rgba(${head}, ${alpha})`;
    ctx.fillRect(m.x - 1, m.y - 1, 2, 2);
  }
}
