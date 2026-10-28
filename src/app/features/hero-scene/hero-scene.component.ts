import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
// Named imports (not "* as THREE") so the build can drop the parts of three.js this file does not use.
import { Color, EdgesGeometry, Group, IcosahedronGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer } from 'three';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-hero-scene',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './hero-scene.component.html',
  styleUrl: './hero-scene.component.css',
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  private readonly sceneHost = viewChild.required<ElementRef<HTMLDivElement>>('scene');
  private readonly zone = inject(NgZone);
  private visibility?: IntersectionObserver;

  private renderer?: WebGLRenderer;
  private rafId?: number;

  private onPointerMove?: (event: PointerEvent) => void;
  private onScroll?: () => void;
  private onResize?: () => void;

  ngAfterViewInit(): void {
    // The render loop and its listeners run outside Angular: a frame must not trigger change
    // detection for the whole app (it did, 60 times a second, for as long as the page was open).
    this.zone.runOutsideAngular(() => this.initScene());
  }

  ngOnDestroy(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }
    this.visibility?.disconnect();

    const host = this.sceneHost().nativeElement;
    if (this.onPointerMove) {
      host.removeEventListener('pointermove', this.onPointerMove);
    }
    if (this.onScroll) {
      window.removeEventListener('scroll', this.onScroll);
    }
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }

    this.renderer?.dispose();
  }

  private initScene(): void {
    const host = this.sceneHost().nativeElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const w = host.clientWidth;
    const h = host.clientHeight;

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    // 1.5x is indistinguishable for thin lines and draws up to 44% fewer pixels than 2x.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new Scene();
    const cam = new PerspectiveCamera(fitFov(w / h), w / h, 0.1, 100);
    cam.position.z = 3.4;

    const geo = new IcosahedronGeometry(1.15, 1);
    const wireMaterial = new LineBasicMaterial({ color: 0xe9eaed, transparent: true, opacity: 0.55 });
    const wire = new LineSegments(new EdgesGeometry(geo), wireMaterial);
    const coreMaterial = new MeshBasicMaterial({ color: 0xf2541b, wireframe: true, transparent: true, opacity: 0.18 });
    const core = new Mesh(geo, coreMaterial);
    const pts = new Points(geo, new PointsMaterial({ color: 0xf2541b, size: 0.05 }));

    const grp = new Group();
    grp.add(wire, core, pts);
    scene.add(grp);

    let mx = 0;
    let my = 0;
    let scrollR = 0;
    // Scroll-driven: as the hero scrolls away the object spins up, its vertices drift apart and the
    // wireframe heats from bone to ember. All of it is per-frame math on a few objects (cheap).
    let target = 0; // 0 at the top, 1 once the hero has scrolled away
    let progress = 0;
    let spin = 0;
    let lastY = window.scrollY;
    const bone = new Color(0xe9eaed);
    const ember = new Color(0xf2541b);

    this.onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    };
    host.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.onScroll = () => {
      const y = window.scrollY;
      scrollR = y * 0.0004;
      target = Math.min(1, Math.max(0, y / (window.innerHeight * 0.9)));
      spin = Math.min(0.06, spin + Math.abs(y - lastY) * 0.00012);
      lastY = y;
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });

    // Only draws while the object is on screen; scrolled away, the loop stops until it comes back.
    let visible = true;
    const loop = () => {
      if (!visible) {
        this.rafId = undefined;
        return;
      }
      this.rafId = requestAnimationFrame(loop);
      if (!reduce) {
        grp.rotation.y += 0.0042 + spin;
        grp.rotation.x += 0.0016 + spin * 0.4;
        spin *= 0.92;
        progress += (target - progress) * 0.08;
        pts.scale.setScalar(1 + progress * 0.9);
        wire.scale.setScalar(1 + progress * 0.12);
        coreMaterial.opacity = 0.18 * (1 - progress);
        wireMaterial.color.lerpColors(bone, ember, progress);
      }
      grp.rotation.z = scrollR;
      grp.position.x += (mx * 0.4 - grp.position.x) * 0.05;
      grp.position.y += (-my * 0.3 - grp.position.y) * 0.05;
      renderer.render(scene, cam);
    };

    if (reduce) {
      renderer.render(scene, cam);
    }
    this.rafId = requestAnimationFrame(loop);
    this.visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && this.rafId === undefined) this.rafId = requestAnimationFrame(loop);
    });
    this.visibility.observe(host);

    this.onResize = () => {
      const nw = host.clientWidth;
      const nh = host.clientHeight;
      cam.aspect = nw / nh;
      cam.fov = fitFov(cam.aspect);
      cam.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', this.onResize);
  }
}

/**
 * Vertical field of view that keeps the whole object in frame horizontally too: 45 degrees on wide
 * canvases, wider when the canvas is narrower than tall (e.g. the hero column at 1920px), so the
 * icosahedron (radius 1.15 plus the pointer parallax) never gets cut at the sides.
 */
function fitFov(aspect: number): number {
  const halfWidthNeeded = 1.45; // world units around the center
  const distance = 3.4; // camera z
  const fov = (2 * Math.atan(halfWidthNeeded / (distance * aspect)) * 180) / Math.PI;
  return Math.max(45, fov);
}
