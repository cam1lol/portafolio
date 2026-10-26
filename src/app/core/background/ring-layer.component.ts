import { ChangeDetectionStrategy, Component } from '@angular/core';

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛏᛒᛖᛗᛚᛜᛞᛟ·';

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
  // Each rotating ring is its own <svg> and the rotation is applied to that element, so the
  // browser composites it on the GPU instead of repainting one big filtered SVG every frame
  // (that repaint is what made the rings render in broken tiles).
  template: `
<div class="rings" aria-hidden="true">
  <!-- Static: ambient glow and center marker -->
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

  <!-- Layer 1: outer measurement ring, very slow CW -->
  <svg class="layer l1" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
    <circle r="308" fill="none" stroke="#e85525" stroke-width="3.74" stroke-opacity=".95"/>
    <circle r="298" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".55"/>
    <path [attr.d]="majTicks"  fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".9"/>
    <path [attr.d]="minTicks"  fill="none" stroke="#e85525" stroke-width="1.36"  stroke-opacity=".5"/>
    <path [attr.d]="microTicks" fill="none" stroke="#e85525" stroke-width="0.85" stroke-opacity=".3"/>
    @for (angle of [0,90,180,270]; track angle) {
      <polygon [attr.transform]="'rotate(' + angle + ')'" points="0,-293 6,-302 0,-311 -6,-302"
               fill="none" stroke="#e85525" stroke-width="2.04" stroke-opacity=".9"/>
    }
  </svg>

  <!-- Layer 2: outer rune text ring, slow CCW -->
  <svg class="layer l2" viewBox="-320 -320 640 640">
    <defs><path id="ring-text-outer" d="M 0,-268 A 268,268 0 1,1 -0.01,-268"/></defs>
    <text font-size="11" fill="#e85525" fill-opacity=".7" font-family="monospace" letter-spacing="3.5">
      <textPath href="#ring-text-outer">{{ runeOuter }}</textPath>
    </text>
  </svg>

  <!-- Layer 3: second ring with ornaments, medium CW -->
  <svg class="layer l3" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
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

  <!-- Layer 4: hexagram ring, slow CCW -->
  <svg class="layer l4" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
    <circle r="170" fill="none" stroke="#e85525" stroke-width="2.72" stroke-opacity=".75"/>
    <circle r="162" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".4"/>
    <polygon [attr.points]="triUp" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
    <polygon [attr.points]="triDown" fill="none" stroke="#e85525" stroke-width="2.55" stroke-opacity=".8"/>
    @for (v of hexVerts; track $index) {
      <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="4" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".8"/>
    }
  </svg>

  <!-- Layer 5: pentagram ring, medium CW -->
  <svg class="layer l5" viewBox="-320 -320 640 640" stroke-linecap="round" stroke-linejoin="round">
    <circle r="108" fill="none" stroke="#e85525" stroke-width="3.06" stroke-opacity=".85"/>
    <circle r="100" fill="none" stroke="#e85525" stroke-width="1.19" stroke-opacity=".45"/>
    <path [attr.d]="penta" fill="none" stroke="#e85525" stroke-width="3.4" stroke-opacity=".95"/>
    @for (v of pentaVerts; track $index) {
      <circle [attr.cx]="v[0]" [attr.cy]="v[1]" r="3.5" fill="none" stroke="#e85525" stroke-width="1.7" stroke-opacity=".85"/>
    }
  </svg>

  <!-- Layer 6: inner rune ring, CCW -->
  <svg class="layer l6" viewBox="-320 -320 640 640">
    <defs><path id="ring-text-inner" d="M 0,-118 A 118,118 0 1,1 -0.01,-118"/></defs>
    <text font-size="9" fill="#e85525" fill-opacity=".6" font-family="monospace" letter-spacing="2.5">
      <textPath href="#ring-text-inner">{{ runeInner }}</textPath>
    </text>
  </svg>
</div>
  `,
  styleUrl: './ring-layer.component.css',
})
export class RingLayerComponent {
  readonly runeOuter = repeat(RUNES, 7);
  readonly runeInner = repeat(RUNES, 3);

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
}
