import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  OnDestroy,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';

/**
 * Fixed colors for the summoning circle. These are a brand signature and
 * deliberately do NOT read from ThemeService or CSS custom properties:
 * they stay identical in day and night mode.
 */
const COLOR_VOID = 0x050505;
const COLOR_EMBER = 0xf2541b;

interface Layer {
  mesh: THREE.Object3D;
  /** Radians per frame, signed (direction baked into the sign). */
  speed: number;
}

/**
 * `LineBasicMaterial`'s `linewidth` is ignored by most desktop GPU drivers
 * (a long-standing WebGL/ANGLE limitation), so plain Three.js lines can
 * never read as genuinely "thick" no matter what width is requested. This
 * builds an actual ribbon mesh instead — a strip of quads following the
 * path — which renders at a real, reliable pixel width on every machine.
 */
function buildThickPolyline(
  points: THREE.Vector2[],
  width: number,
  color: number,
  opacity: number,
  additive: boolean,
): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertCount = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);
    positions.push(a.x + nx, a.y + ny, 0);
    positions.push(a.x - nx, a.y - ny, 0);
    positions.push(b.x + nx, b.y + ny, 0);
    positions.push(b.x - nx, b.y - ny, 0);
    indices.push(vertCount, vertCount + 1, vertCount + 2, vertCount + 1, vertCount + 3, vertCount + 2);
    vertCount += 4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  return new THREE.Mesh(geometry, material);
}

function circlePoints(radius: number, segments: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return points;
}

function buildThickCircle(
  radius: number,
  segments: number,
  width: number,
  color: number,
  opacity: number,
  additive = false,
): THREE.Mesh {
  return buildThickPolyline(circlePoints(radius, segments), width, color, opacity, additive);
}

/** A star traced by connecting every `skip`-th vertex of a regular polygon (5/2 = pentagram). */
function buildThickStar(
  radius: number,
  points: number,
  skip: number,
  width: number,
  color: number,
  opacity: number,
  additive = false,
): THREE.Mesh {
  const outer: THREE.Vector2[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    outer.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  const path: THREE.Vector2[] = [];
  let idx = 0;
  for (let i = 0; i <= points; i++) {
    path.push(outer[idx]);
    idx = (idx + skip) % points;
  }
  return buildThickPolyline(path, width, color, opacity, additive);
}

/**
 * A ring of short radial tick marks ("rune ring") rather than a plain
 * circle. A perfectly smooth circle/torus is rotationally symmetric around
 * its own spin axis, so rotating one is visually indistinguishable from
 * standing still. Discrete ticks at a fixed angular spacing make rotation
 * actually readable as motion, the same way a clock face's minute ticks
 * make the dial read as turning.
 */
function buildTickRing(
  radius: number,
  count: number,
  tickLength: number,
  color: number,
  opacity: number,
): THREE.LineSegments {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    positions.push(cos * radius, sin * radius, 0);
    positions.push(cos * (radius + tickLength), sin * (radius + tickLength), 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(geometry, material);
}

/** Lines radiating outward past the circle's edge, like a burst of spikes. */
function buildSpikes(
  innerRadius: number,
  outerRadius: number,
  count: number,
  color: number,
  opacity: number,
): THREE.LineSegments {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    positions.push(cos * innerRadius, sin * innerRadius, 0);
    positions.push(cos * outerRadius, sin * outerRadius, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineSegments(geometry, material);
}

/**
 * Hand-painted detail that pure vector geometry can't cheaply reproduce:
 * a soft glow core, an engraved (shadow+highlight) ring set, a varied
 * glyph band, and fine grain speckle across an annulus. Drawn once onto a
 * 2D canvas and used as a texture on a flat additive-blended plane — far
 * richer than more line segments, for the same per-frame render cost.
 */
function buildRuneTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const cx = size / 2;
  const cy = size / 2;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.47);
  glow.addColorStop(0, 'rgba(242,84,27,0.32)');
  glow.addColorStop(0.4, 'rgba(242,84,27,0.1)');
  glow.addColorStop(1, 'rgba(242,84,27,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const ringRadii = [0.46, 0.4, 0.305, 0.21, 0.105];
  for (const f of ringRadii) {
    const r = f * size;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.0035, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = size * 0.004;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.0035, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242,84,27,0.32)';
    ctx.lineWidth = size * 0.003;
    ctx.stroke();
  }

  const glyphRadius = size * 0.355;
  const glyphCount = 54;
  for (let i = 0; i < glyphCount; i++) {
    const angle = (i / glyphCount) * Math.PI * 2;
    const gx = cx + Math.cos(angle) * glyphRadius;
    const gy = cy + Math.sin(angle) * glyphRadius;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle + Math.PI / 2);
    const s = size * 0.013;
    const kind = i % 3;
    ctx.strokeStyle = `rgba(242,84,27,${0.22 + (i % 4) * 0.06})`;
    ctx.lineWidth = size * 0.0024;
    if (kind === 0) {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s);
      ctx.stroke();
    } else if (kind === 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, 0);
      ctx.lineTo(s * 0.55, 0);
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(0, s * 0.55);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(242,84,27,0.28)';
      ctx.fill();
    }
    ctx.restore();
  }

  for (let i = 0; i < 1100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = size * (0.07 + Math.random() * 0.42);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '242,84,27' : '0,0,0'},${0.03 + Math.random() * 0.07})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.0012, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

@Component({
  selector: 'app-summoning-circle',
  standalone: true,
  templateUrl: './summoning-circle.component.html',
  styleUrl: './summoning-circle.component.css',
})
export class SummoningCircleComponent implements AfterViewInit, OnDestroy {
  // z-index:-1 puts the canvas below the document's default stacking
  // context (body content, header z-index:50, .hud z-index:60 all stay
  // above it) while remaining above the plain `body { background }`
  // color, since the host itself paints on top of that base color.
  @HostBinding('style.position') hostPosition = 'fixed';
  @HostBinding('style.inset') hostInset = '0';
  @HostBinding('style.zIndex') hostZIndex = '-1';
  @HostBinding('style.pointerEvents') hostPointerEvents = 'none';
  @HostBinding('style.display') hostDisplay = 'block';

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private group?: THREE.Group;
  private layers: Layer[] = [];

  private rafId?: number;
  private paused = false;
  private reduceMotion = false;

  private onResize?: () => void;
  private onVisibilityChange?: () => void;

  ngAfterViewInit(): void {
    this.initScene();
  }

  ngOnDestroy(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }
    this.renderer?.dispose();
  }

  private initScene(): void {
    const host = this.host().nativeElement;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 4.2;
    this.camera = camera;

    const group = new THREE.Group();
    this.group = group;

    // Painted texture backdrop — glow, engraved rings, glyph band, grain.
    const glowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.3, 4.3),
      new THREE.MeshBasicMaterial({
        map: buildRuneTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    // Bold structural rings/star — real ribbon-mesh thickness.
    const rimOuter = buildThickCircle(2.05, 128, 0.028, COLOR_VOID, 0.5);
    const rimEmber = buildThickCircle(1.95, 128, 0.018, COLOR_EMBER, 0.24, true);
    const midFrame = buildThickCircle(1.5, 112, 0.022, COLOR_VOID, 0.45);
    const pentagram = buildThickStar(1.18, 5, 2, 0.026, COLOR_EMBER, 0.32, true);
    const pentagramFrame = buildThickCircle(1.24, 96, 0.014, COLOR_EMBER, 0.2, true);
    const triad = buildThickStar(0.58, 3, 1, 0.018, COLOR_VOID, 0.4);
    const innerFrame = buildThickCircle(0.42, 64, 0.016, COLOR_VOID, 0.5);
    const core = buildThickCircle(0.16, 48, 0.012, COLOR_EMBER, 0.3, true);

    // Fine texture/detail — thin accent lines layered between the bold rings.
    const outerSpikes = buildSpikes(2.08, 2.62, 24, COLOR_VOID, 0.45);
    const outerRunes = buildTickRing(1.78, 72, 0.07, COLOR_EMBER, 0.22);
    const glyphRing = buildTickRing(1.62, 36, 0.1, COLOR_EMBER, 0.18);
    const innerRunes = buildTickRing(0.74, 40, 0.05, COLOR_EMBER, 0.2);

    group.add(
      glowMesh,
      rimOuter,
      rimEmber,
      outerSpikes,
      outerRunes,
      midFrame,
      glyphRing,
      pentagramFrame,
      pentagram,
      triad,
      innerFrame,
      innerRunes,
      core,
    );
    scene.add(group);

    // Speeds are deliberately uneven across layers so adjacent rings drift
    // in and out of alignment instead of all turning together as one rigid
    // shape — that relative motion is what reads as "alive" rather than a
    // static emblem. Full turns land roughly between 4s and 18s, including
    // the dominant painted-texture layer (glowMesh) — fast enough that
    // motion is obvious within a couple seconds of looking, not just to
    // someone who stares at it for a full minute.
    this.layers = [
      { mesh: glowMesh, speed: 0.006 },
      { mesh: rimOuter, speed: 0.0088 },
      { mesh: rimEmber, speed: 0.0088 },
      { mesh: outerSpikes, speed: -0.0116 },
      { mesh: outerRunes, speed: 0.021 },
      { mesh: midFrame, speed: -0.0131 },
      { mesh: glyphRing, speed: 0.0161 },
      { mesh: pentagramFrame, speed: 0.0116 },
      { mesh: pentagram, speed: -0.0075 },
      { mesh: triad, speed: 0.019 },
      { mesh: innerFrame, speed: -0.015 },
      { mesh: innerRunes, speed: 0.0262 },
      { mesh: core, speed: -0.0116 },
    ];

    this.onResize = () => {
      const nw = host.clientWidth || window.innerWidth;
      const nh = host.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      if (this.reduceMotion) {
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', this.onResize);

    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.paused = true;
        if (this.rafId !== undefined) {
          cancelAnimationFrame(this.rafId);
          this.rafId = undefined;
        }
        return;
      }
      if (this.paused) {
        this.paused = false;
        if (!this.reduceMotion && this.rafId === undefined) {
          this.rafId = requestAnimationFrame(this.loop);
        }
      }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (this.reduceMotion) {
      // Static single frame: never start the RAF loop.
      renderer.render(scene, camera);
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop = (): void => {
    if (this.paused || !this.renderer || !this.scene || !this.camera || !this.group) {
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);

    for (const layer of this.layers) {
      layer.mesh.rotation.z += layer.speed;
    }

    // A slow scale "breath" on top of the per-layer rotation — easy to
    // notice at a glance even before the rotation itself reads as motion,
    // and it costs nothing extra to compute.
    const pulse = 1 + Math.sin(performance.now() * 0.0006) * 0.035;
    this.group.scale.setScalar(pulse);

    this.renderer.render(this.scene, this.camera);
  };
}
