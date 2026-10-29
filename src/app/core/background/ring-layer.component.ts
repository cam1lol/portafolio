import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, inject, viewChild } from '@angular/core';
import { RING_BURST_EVENT } from '../transitions/project-transition.service';

/** Easter egg (código Konami o escribir "ritual", ver AppComponent): el círculo se activa un momento. */
export const RITUAL_EVENT = 'portfolio:ritual';

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛏᛒᛖᛗᛚᛜᛞᛟ·';

/** Secciones con texto largo (y el cuerpo de un proyecto): el círculo se atenúa mientras cruzan el centro de la pantalla. */
const READING_SECTIONS = '#about, #experience, #services, .project-page .body';

function repeat(s: string, times: number) {
  return Array.from({ length: times }, () => s).join('');
}

function pentagramPath(r: number): string {
  const pts = Array.from({ length: 5 }, (_, k) => {
    const a = ((-90 + k * 72) * Math.PI) / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  // salto de vértices: 0→2→4→1→3→0
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
  // Cada anillo es su propio <svg>: el giro (.spin) y el parallax (.depth) mueven elementos enteros que
  // el navegador compone en la GPU, sin repintar un SVG grande con filtros. El giro y el pulso animan
  // un <div> envoltorio, nunca el <svg>: Chrome no puede llevar al compositor la animación de
  // transform de un <svg> raíz, y lo recalculaba en el hilo principal en cada fotograma.
  template: `
<div #rings class="rings" aria-hidden="true">
  <!-- Estático: brillo ambiental y marca central (lo que más se mueve con el cursor) -->
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

  <!-- Pulso de energía: un anillo que se expande desde el centro cada pocos segundos -->
  <div class="depth" style="--d: 1">
    <div class="pulse"><svg class="layer" viewBox="-320 -320 640 640">
      <circle r="300" fill="none" stroke="#ff8a5c" stroke-width="5" stroke-opacity=".9"/>
      <circle r="300" fill="none" stroke="#e85525" stroke-width="18" stroke-opacity=".18"/>
    </svg></div>
  </div>

  <!-- Capa 1: anillo exterior de medidas, muy lento en sentido horario -->
  <div class="depth" style="--d: 0.35">
    <div class="spin l1"><svg class="layer" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="308" fill="none" stroke="#e85525" stroke-width="3.74" stroke-opacity=".95"/>
      <circle r="298" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".55"/>
      <path [attr.d]="majTicks"  fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".9"/>
      <path [attr.d]="minTicks"  fill="none" stroke="#e85525" stroke-width="1.36" stroke-opacity=".5"/>
      <path [attr.d]="microTicks" fill="none" stroke="#e85525" stroke-width="0.85" stroke-opacity=".3"/>
      @for (angle of [0,90,180,270]; track angle) {
        <polygon [attr.transform]="'rotate(' + angle + ')'" points="0,-293 6,-302 0,-311 -6,-302"
                 fill="none" stroke="#e85525" stroke-width="2.04" stroke-opacity=".9"/>
      }
    </svg></div>
  </div>

  <!-- Capa 2: anillo exterior de runas, lento en sentido antihorario; se encienden runas al azar -->
  <div class="depth" style="--d: 0.5">
    <div class="spin l2"><svg class="layer" viewBox="-320 -320 640 640">
      <defs><path id="ring-text-outer" d="M 0,-268 A 268,268 0 1,1 -0.01,-268"/></defs>
      <text font-size="11" fill="#e85525" fill-opacity=".7" font-family="monospace">
        <textPath href="#ring-text-outer" textLength="1680" lengthAdjust="spacing">@for (rune of outerRunes; track $index) {<tspan class="rune">{{ rune }}</tspan>}</textPath>
      </text>
    </svg></div>
  </div>

  <!-- Capa 3: segundo anillo con ornamentos, velocidad media en sentido horario -->
  <div class="depth" style="--d: 0.65">
    <div class="spin l3"><svg class="layer" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
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
    </svg></div>
  </div>

  <!-- Capa 4: anillo del hexagrama, lento en sentido antihorario -->
  <div class="depth" style="--d: 0.8">
    <div class="spin l4"><svg class="layer" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="170" fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".75"/>
      <circle r="162" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".4"/>
      <polygon [attr.points]="triUp" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
      <polygon [attr.points]="triDown" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
      @for (v of hexVerts; track $index) {
        <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="4" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".8"/>
      }
    </svg></div>
  </div>

  <!-- Capa 5: anillo del pentagrama, velocidad media en sentido horario -->
  <div class="depth" style="--d: 1">
    <div class="spin l5"><svg class="layer" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
      <circle r="108" fill="none" stroke="#e85525" stroke-width="3.06" stroke-opacity=".85"/>
      <circle r="100" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".45"/>
      <path [attr.d]="penta" fill="none" stroke="#e85525" stroke-width="3.4" stroke-opacity=".95"/>
      @for (v of pentaVerts; track $index) {
        <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="3.5" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".85"/>
      }
    </svg></div>
  </div>

  <!-- Capa 6: anillo interior de runas, antihorario; se encienden runas al azar -->
  <div class="depth" style="--d: 1.15">
    <div class="spin l6"><svg class="layer" viewBox="-320 -320 640 640">
      <defs><path id="ring-text-inner" d="M 0,-118 A 118,118 0 1,1 -0.01,-118"/></defs>
      <text font-size="9" fill="#e85525" fill-opacity=".6" font-family="monospace">
        <textPath href="#ring-text-inner" textLength="738" lengthAdjust="spacing">@for (rune of innerRunes; track $index) {<tspan class="rune">{{ rune }}</tspan>}</textPath>
      </text>
    </svg></div>
  </div>
</div>
  `,
  styleUrl: './ring-layer.component.css',
})
export class RingLayerComponent implements AfterViewInit {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rings = viewChild.required<ElementRef<HTMLDivElement>>('rings');

  // textLength (en el textPath) reparte las runas por toda la circunferencia, 2 * PI * r, para que el
  // anillo cierre sin hueco: exterior r=268 -> 1680, interior r=118 -> 738.
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
    // Todo lo de abajo solo toca estilos y clases, así que corre fuera de Angular: sin detección de
    // cambios por fotograma.
    this.zone.runOutsideAngular(() => {
      this.dimWhileReading(root);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.motionLoop(root);
      this.runeSparks(root);
      this.energyPulse(root);
    });
  }

  /**
   * Aceleración por scroll y parallax del cursor en un solo bucle rAF. Al hacer scroll los anillos
   * giran más rápido (playbackRate conserva el ángulo, sin saltos) y vuelven despacio al parar. El
   * bucle se duerme cuando todo se asienta y despierta con scroll, puntero o ráfaga. La posición se
   * lee en el evento de scroll y el parallax mueve cada capa directamente: una página quieta no hace
   * ningún trabajo y ningún fotograma fuerza un layout.
   */
  private motionLoop(root: HTMLElement): void {
    const animations = Array.from(root.querySelectorAll<HTMLElement>('.spin')).flatMap((el) => el.getAnimations());
    const depths = Array.from(root.querySelectorAll<HTMLElement>('.depth')).map((el) => ({
      el,
      d: parseFloat(el.style.getPropertyValue('--d')) || 1,
      last: '',
    }));
    // Cualquier ratón o trackpad (no solo el puntero principal): los portátiles táctiles reportan el toque como principal.
    const finePointer = window.matchMedia('(any-pointer: fine)').matches;

    let scrollY = window.scrollY;
    let lastY = scrollY;
    let lastT = performance.now();
    let rate = 1;
    let appliedRate = 1;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frameId = 0;

    const wake = () => {
      if (frameId) return;
      lastT = performance.now();
      frameId = requestAnimationFrame(frame);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
      wake();
    };
    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      wake();
    };
    // El cursor salió de la ventana: vuelve al centro en vez de quedarse desplazado.
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        targetX = 0;
        targetY = 0;
        wake();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (finePointer) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('mouseout', onLeave);
    }
    // Al abrir un proyecto: un acelerón repentino que se calma solo (con la misma curva que el scroll).
    const onBurst = () => {
      rate = Math.max(rate, 8);
      wake();
    };
    window.addEventListener(RING_BURST_EVENT, onBurst);
    const onRitual = () => {
      rate = 14;
      wake();
    };
    window.addEventListener(RITUAL_EVENT, onRitual);

    function frame(now: number): void {
      const dt = Math.max(16, now - lastT);
      const speed = Math.abs(scrollY - lastY) / dt; // px por ms
      lastY = scrollY;
      lastT = now;

      // Hasta 5 veces más rápido al hacer scroll; acelera rápido y se calma despacio.
      const target = 1 + Math.min(speed * 3, 4);
      rate += (target - rate) * (target > rate ? 0.18 : 0.035);
      if (speed === 0 && Math.abs(rate - 1) < 0.01) rate = 1;
      if (Math.abs(rate - appliedRate) > 0.01 || (rate === 1 && appliedRate !== 1)) {
        appliedRate = rate;
        for (const animation of animations) animation.playbackRate = rate;
      }

      let moving = false;
      if (finePointer) {
        x += (targetX - x) * 0.05;
        y += (targetY - y) * 0.05;
        if (Math.abs(targetX - x) < 0.002 && Math.abs(targetY - y) < 0.002) {
          x = targetX;
          y = targetY;
        } else {
          moving = true;
        }
        for (const depth of depths) {
          const value = `translate3d(${(x * 16 * depth.d).toFixed(1)}px, ${(y * 16 * depth.d).toFixed(1)}px, 0)`;
          if (value !== depth.last) {
            depth.last = value;
            depth.el.style.transform = value;
          }
        }
      }

      // Dormido hasta el próximo scroll, movimiento del puntero o ráfaga.
      frameId = moving || speed > 0 || rate !== 1 ? requestAnimationFrame(frame) : 0;
    }

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('mouseout', onLeave);
      window.removeEventListener(RING_BURST_EVENT, onBurst);
      window.removeEventListener(RITUAL_EVENT, onRitual);
    });
  }

  /** Algunas runas al azar brillan y se apagan, como si el círculo estuviera activo. */
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
        // De vez en cuando una onda corta: tres runas seguidas, una tras otra.
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

  /** Dispara el pulso a intervalos irregulares (7-12 s) para que se sienta vivo y no mecánico. */
  private energyPulse(root: HTMLElement): void {
    const pulse = root.querySelector<HTMLElement>('.pulse');
    if (!pulse) return;
    let timeout: ReturnType<typeof setTimeout>;

    // Web Animations API: cada llamada es una animación nueva y siempre se reproduce (alternar una clase
    // CSS no reinicia bien una animación en elementos SVG).
    const fire = (duration = 3800) => {
      pulse.animate(
        [
          { transform: 'scale(0.12)', opacity: 0 },
          { opacity: 0.85, offset: 0.14 },
          { transform: 'scale(1.06)', opacity: 0 },
        ],
        { duration, easing: 'cubic-bezier(.2, .6, .3, 1)' },
      );
      clearTimeout(timeout);
      timeout = setTimeout(fire, 7000 + Math.random() * 5000);
    };
    timeout = setTimeout(fire, 2500);
    // Abrir un proyecto dispara un pulso rápido al momento (y reinicia el temporizador irregular).
    const onBurst = () => fire(1600);
    window.addEventListener(RING_BURST_EVENT, onBurst);
    // Ritual: tres pulsos rápidos, todas las runas encendidas y el círculo brillando unos segundos.
    const ritualTimers: ReturnType<typeof setTimeout>[] = [];
    const onRitual = () => {
      root.classList.add('ritual');
      root.querySelectorAll('.rune').forEach((rune) => rune.classList.add('lit'));
      [0, 700, 1400].forEach((delay) => ritualTimers.push(setTimeout(() => fire(1500), delay)));
      ritualTimers.push(
        setTimeout(() => {
          root.classList.remove('ritual');
          root.querySelectorAll('.rune.lit').forEach((rune) => rune.classList.remove('lit'));
        }, 4200),
      );
    };
    window.addEventListener(RITUAL_EVENT, onRitual);
    this.destroyRef.onDestroy(() => {
      clearTimeout(timeout);
      ritualTimers.forEach(clearTimeout);
      window.removeEventListener(RING_BURST_EVENT, onBurst);
      window.removeEventListener(RITUAL_EVENT, onRitual);
    });
  }

  /** Atenúa el círculo mientras una sección con mucho texto está en el centro de la pantalla. */
  private dimWhileReading(root: HTMLElement): void {
    // La prueba de impacto fuerza un layout, así que corre como mucho cada 150 ms durante el scroll (el
    // fundido dura .9 s, el retraso no se nota) y una vez más al parar.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    const check = () => {
      const element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      root.classList.toggle('dimmed', !!element?.closest(READING_SECTIONS));
    };
    const tick = () => {
      timer = undefined;
      if (!pending) return;
      pending = false;
      check();
      timer = setTimeout(tick, 150);
    };
    const onScroll = () => {
      pending = true;
      if (!timer) timer = setTimeout(tick, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
    this.destroyRef.onDestroy(() => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    });
  }
}
