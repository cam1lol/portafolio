import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
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

  private renderer?: THREE.WebGLRenderer;
  private rafId?: number;

  private onPointerMove?: (event: PointerEvent) => void;
  private onScroll?: () => void;
  private onResize?: () => void;

  ngAfterViewInit(): void {
    this.initScene();
  }

  ngOnDestroy(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }

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

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(fitFov(w / h), w / h, 0.1, 100);
    cam.position.z = 3.4;

    const geo = new THREE.IcosahedronGeometry(1.15, 1);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xe9eaed, transparent: true, opacity: 0.55 }),
    );
    const core = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0xf2541b,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      }),
    );
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf2541b, size: 0.05 }));

    const grp = new THREE.Group();
    grp.add(wire, core, pts);
    scene.add(grp);

    let mx = 0;
    let my = 0;
    let scrollR = 0;

    this.onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    };
    host.addEventListener('pointermove', this.onPointerMove);

    this.onScroll = () => {
      scrollR = window.scrollY * 0.0004;
    };
    window.addEventListener('scroll', this.onScroll);

    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      if (!reduce) {
        grp.rotation.y += 0.0042;
        grp.rotation.x += 0.0016;
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
