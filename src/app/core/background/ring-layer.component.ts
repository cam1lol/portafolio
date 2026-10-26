import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, inject, viewChild } from '@angular/core';

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛏᛒᛖᛗᛚᛜᛞᛟ·';

/** Sections with long text: the circle fades while one of them crosses the middle of the screen. */
const READING_SECTIONS = '#about, #experience, #services';

function repeat(s: string, times: number) {
  return Array.from({ length: times }, () => s).join('');
}

function pentagramPath(r: number): string {
  const pts = Array.from({ length: 5 }, (_, k) => {
    const a = ((-90 + k * 72) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  // skip-connect: 0→2→4→1→3→0
  const order = [0, 2, 4, 1, 3, 0];
  return order.map((i, idx) =>
    `${idx === 0 ? 'M' : 'L'} ${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`
  ).join(' ') + ' Z';
}

function trianglePath(r: number, up: boolean): string {
  const base = up ? -90 : 90;
  const pts = [0, 120, 240].map(d => {
    const a = ((base + d) * Math.PI) / 180;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  });
  return pts.join(' ');
}

function tickPath(rIn: number, rOut: number, every: number): string {
  const segs: string[] = [];
  for (let deg = 0; deg < 360; deg += every) {
    const a = (deg * Math.PI) / 180;
    const x1 = (rIn * Math.cos(a)).toFixed(2);
    const y1 = (rIn * Math.sin(a)).toFixed(2);
    const x2 = (rOut * Math.cos(a)).toFixed(2);
    const y2 = (rOut * Math.sin(a)).toFixed(2);
    segs.push(`M ${x1},${y1} L ${x2},${y2}`);
  }
  return segs.join(' ');
}

@Component({
  selector: 'app-ring-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Each ring is its own <svg>: rotation (.spin) and parallax (.depth) move whole elements,
  // which the browser composites on the GPU instead of repainting a big filtered SVG.
  template: `
<div #rings class="rings" aria-hidden="true">
  <!-- Static: ambient glow and center marker (moves the most with the cursor) -->
  <div class="depth" style="--d: 1.3">
    <svg class="layer" viewBox="-320 -320 640 640">
      <defs>
        <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#e85525" stop-opacity=".35"/>
          <stop offset="55%"  stop-color="#e85525" stop-opacity=".08"/>
          <stop offset="100%" stop-color="#e85525" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle r="290" fill="url(#ring-glow)"/>
      <circle r="34" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".6"/>
      <circle r="26" fill="none" stroke="#e85525" stroke-width="0.85" stroke-opacity=".35"/>
      <circle r="5"  fill="#e85525" fill-opacity=".8"/>
    </svg>
  </div>

  <!-- Energy pulse: a ring that expands from the center every few seconds -->
  <div class="depth" style="--d: 1">
    <svg class="layer pulse" viewBox="-320 -320 640 640">
      <circle r="300" fill="none" stroke="#ff8a5c" stroke-width="5" stroke-opacity=".9"/>
      <circle r="300" fill="none" stroke="#e85525" stroke-width="18" stroke-opacity=".18"/>
    </svg>
  </div>

  <!-- Layer 1: outer measurement ring, very slow CW -->
  <div class="depth" style="--d: 0.35">
    <svg class="layer spin l1" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="308" fill="none" stroke="#e85525" stroke-width="3.74" stroke-opacity=".95"/>
      <circle r="298" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".55"/>
      <path [attr.d]="majTicks"  fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".9"/>
      <path [attr.d]="minTicks"  fill="none" stroke="#e85525" stroke-width="1.36" stroke-opacity=".5"/>
      <path [attr.d]="microTicks" fill="none" stroke="#e85525" stroke-width="0.85" stroke-opacity=".3"/>
      @for (angle of [0,90,180,270]; track angle) {
        <polygon [attr.transform]="'rotate(' + angle + ')'" points="0,-293 6,-302 0,-311 -6,-302"
                 fill="none" stroke="#e85525" stroke-width="2.04" stroke-opacity=".9"/>
      }
    </svg>
  </div>

  <!-- Layer 2: outer rune text ring, slow CCW; random runes light up -->
  <div class="depth" style="--d: 0.5">
    <svg class="layer spin l2" viewBox="-320 -320 640 640">
      <defs><path id="ring-text-outer" d="M 0,-268 A 268,268 0 1,1 -0.01,-268"/></defs>
      <text font-size="11" fill="#e85525" fill-opacity=".7" font-family="monospace">
        <textPath href="#ring-text-outer" textLength="1680" lengthAdjust="spacing">@for (rune of outerRunes; track $index) {<tspan class="rune">{{ rune }}</tspan>}</textPath>
      </text>
    </svg>
  </div>

  <!-- Layer 3: second ring with ornaments, medium CW -->
  <div class="depth" style="--d: 0.65">
    <svg class="layer spin l3" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="228" fill="none" stroke="#e85525" stroke-width="3.06" stroke-opacity=".85"/>
      <circle r="220" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".45"/>
      @for (angle of [0,90,180,270]; track angle) {
        <g [attr.transform]="'rotate(' + angle + ')'">
          <line x1="0" y1="-220" x2="0" y2="-240" stroke="#e85525" stroke-width="2.04" stroke-opacity=".7"/>
          <polygon points="0,-228 5,-238 -5,-238" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".8"/>
        </g>
      }
      @for (angle of [45,135,225,315]; track angle) {
        <line [attr.transform]="'rotate(' + angle + ')'" x1="0" y1="-222" x2="0" y2="-226"
              stroke="#e85525" stroke-width="1.36" stroke-opacity=".5"/>
      }
    </svg>
  </div>

  <!-- Layer 4: hexagram ring, slow CCW -->
  <div class="depth" style="--d: 0.8">
    <svg class="layer spin l4" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="170" fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".75"/>
      <circle r="162" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".4"/>
      <polygon [attr.points]="triUp" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
      <polygon [attr.points]="triDown" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
      @for (v of hexVerts; track $index) {
        <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="4" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".8"/>
      }
    </svg>
  </div>

  <!-- Layer 5: pentagram ring, medium CW -->
  <div class="depth" style="--d: 1">
    <svg class="layer spin l5" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="108" fill="none" stroke="#e85525" stroke-width="3.06" stroke-opacity=".85"/>
      <circle r="100" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".45"/>
      <path [attr.d]="penta" fill="none" stroke="#e85525" stroke-width="3.4" stroke-opacity=".95"/>
      @for (v of pentaVerts; track $index) {
        <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="3.5" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".85"/>
      }
    </svg>
  </div>

  <!-- Layer 6: inner rune ring, CCW; random runes light up -->
  <div class="depth" style="--d: 1.15">
    <svg class="layer spin l6" viewBox="-320 -320 640 640">
      <defs><path id="ring-text-inner" d="M 0,-118 A 118,118 0 1,1 -0.01,-118"/></defs>
      <text font-size="9" fill="#e85525" fill-opacity=".6" font-family="monospace">
        <textPath href="#ring-text-inner" textLength="738" lengthAdjust="spacing">@for (rune of innerRunes; track $index) {<tspan class="rune">{{ rune }}</tspan>}</textPath>
      </text>
    </svg>
  </div>
</div>
  `,
  styleUrl: './ring-layer.component.css',
})
export class RingLayerComponent implements AfterViewInit {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rings = viewChild.required<ElementRef<HTMLDivElement>>('rings');

  // textLength (on the textPath) spreads the runes over the full circumference, 2 * PI * r,
  // so the ring closes with no gap: outer r=268 -> 1680, inner r=118 -> 738.
  readonly outerRunes = Array.from(repeat(RUNES, 7));
  readonly innerRunes = Array.from(repeat(RUNES, 4));

  readonly majTicks   = tickPath(285, 296, 30);
  readonly minTicks   = tickPath(290, 296, 10);
  readonly microTicks = tickPath(293, 296, 5);

  readonly penta = pentagramPath(90);
  readonly pentaVerts = Array.from({ length: 5 }, (_, k) => {
    const a = ((-90 + k * 72) * Math.PI) / 180;
    return [90 * Math.cos(a), 90 * Math.sin(a)];
  });

  readonly triUp   = trianglePath(155, true);
  readonly triDown = trianglePath(155, false);
  readonly hexVerts = [0, 60, 120, 180, 240, 300].map(d => {
    const a = (d * Math.PI) / 180;
    return [155 * Math.cos(a), 155 * Math.sin(a)];
  });

  ngAfterViewInit(): void {
    const root = this.rings().nativeElement;
    // Everything below only touches styles and classes, so it runs outside Angular:
    // no change detection per frame.
    this.zone.runOutsideAngular(() => {
      this.dimWhileReading(root);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.motionLoop(root);
      this.runeSparks(root);
      this.energyPulse(root);
    });
  }

  /**
   * Scroll boost + cursor parallax in one rAF loop. Scrolling speeds the rings up (playbackRate
   * keeps their current angle, so there is no jump) and they ease back when scrolling stops.
   */
  private motionLoop(root: HTMLElement): void {
    const animations = Array.from(root.querySelectorAll<HTMLElement>('.spin')).flatMap((el) => el.getAnimations());
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let rate = 1;
    let appliedRate = 1;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frameId = 0;

    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    // Cursor left the window: drift back to the center instead of staying offset.
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        targetX = 0;
        targetY = 0;
      }
    };
    if (finePointer) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('mouseout', onLeave);
    }

    const frame = (now: number) => {
      const dt = Math.max(16, now - lastT);
      const speed = Math.abs(window.scrollY - lastY) / dt; // px per ms
      lastY = window.scrollY;
      lastT = now;

      // Up to 5x faster while scrolling; quick to speed up, slow to settle.
      const target = 1 + Math.min(speed * 3, 4);
      rate += (target - rate) * (target > rate ? 0.18 : 0.035);
      if (Math.abs(rate - appliedRate) > 0.01) {
        appliedRate = rate;
        for (const animation of animations) animation.playbackRate = rate;
      }

      if (finePointer) {
        x += (targetX - x) * 0.05;
        y += (targetY - y) * 0.05;
        root.style.setProperty('--px', (x * 16).toFixed(2));
        root.style.setProperty('--py', (y * 16).toFixed(2));
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('mouseout', onLeave);
    });
  }

  /** A few random runes glow and fade back, as if the circle were active. */
  private runeSparks(root: HTMLElement): void {
    const runes = Array.from(root.querySelectorAll<SVGTSpanElement>('.rune'));
    if (runes.length === 0) return;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    const later = (fn: () => void, ms: number) => {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        fn();
      }, ms);
      timeouts.add(timeout);
    };
    const light = (rune: SVGTSpanElement, delay: number) =>
      later(() => {
        rune.classList.add('lit');
        later(() => rune.classList.remove('lit'), 1600);
      }, delay);

    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        // Now and then a short wave: three consecutive runes, one after another.
        const start = Math.floor(Math.random() * (runes.length - 3));
        for (let i = 0; i < 3; i++) light(runes[start + i], i * 140);
      } else {
        for (let i = 0; i < 3; i++) light(runes[Math.floor(Math.random() * runes.length)], 0);
      }
    }, 1100);

    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    });
  }

  /** Fires the expanding pulse at irregular intervals (7-12 s) so it feels alive, not mechanical. */
  private energyPulse(root: HTMLElement): void {
    const pulse = root.querySelector<SVGSVGElement>('.pulse');
    if (!pulse) return;
    let timeout: ReturnType<typeof setTimeout>;

    // Web Animations API: every call is a fresh animation, so it always replays
    // (toggling a CSS class does not reliably restart an animation on SVG elements).
    const fire = () => {
      pulse.animate(
        [
          { transform: 'scale(0.12)', opacity: 0 },
          { opacity: 0.85, offset: 0.14 },
          { transform: 'scale(1.06)', opacity: 0 },
        ],
        { duration: 3800, easing: 'cubic-bezier(.2, .6, .3, 1)' },
      );
      timeout = setTimeout(fire, 7000 + Math.random() * 5000);
    };
    timeout = setTimeout(fire, 2500);
    this.destroyRef.onDestroy(() => clearTimeout(timeout));
  }

  /** Fades the circle while a text-heavy section sits in the middle of the screen. */
  private dimWhileReading(root: HTMLElement): void {
    let scheduled = false;
    const check = () => {
      scheduled = false;
      const element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      root.classList.toggle('dimmed', !!element?.closest(READING_SECTIONS));
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }
}
