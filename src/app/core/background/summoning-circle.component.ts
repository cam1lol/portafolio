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

interface Ring {
  mesh: THREE.Object3D;
  /** Radians per frame, signed (direction baked into the sign). */
  speed: number;
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
  private rings: Ring[] = [];

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

    // Ring 1 (outer, torus): slow clockwise.
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.015, 12, 96),
      new THREE.MeshBasicMaterial({
        color: COLOR_EMBER,
        transparent: true,
        opacity: 0.14,
      }),
    );

    // Ring 2 (middle, ring): faster counter-clockwise.
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.08, 64),
      new THREE.MeshBasicMaterial({
        color: COLOR_VOID,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
      }),
    );

    // Ring 3 (inner, line loop circle): very slow clockwise, ember trace.
    const innerSegments = 64;
    const innerPoints: THREE.Vector3[] = [];
    for (let i = 0; i < innerSegments; i++) {
      const angle = (i / innerSegments) * Math.PI * 2;
      innerPoints.push(new THREE.Vector3(Math.cos(angle) * 0.62, Math.sin(angle) * 0.62, 0));
    }
    const ring3 = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(innerPoints),
      new THREE.LineBasicMaterial({
        color: COLOR_EMBER,
        transparent: true,
        opacity: 0.18,
      }),
    );

    group.add(ring1, ring2, ring3);
    scene.add(group);

    this.rings = [
      { mesh: ring1, speed: 0.0009 }, // slow clockwise
      { mesh: ring2, speed: -0.0022 }, // faster counter-clockwise
      { mesh: ring3, speed: 0.0004 }, // very slow clockwise
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
    if (this.paused || !this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);

    for (const ring of this.rings) {
      ring.mesh.rotation.z += ring.speed;
    }

    this.renderer.render(this.scene, this.camera);
  };
}
