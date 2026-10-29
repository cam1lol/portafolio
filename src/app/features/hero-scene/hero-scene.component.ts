import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
// Imports con nombre (no "* as THREE") para que el build descarte las partes de three.js que no se usan aquí.
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
    // El bucle de render y sus listeners corren fuera de Angular: un fotograma no debe disparar la
    // detección de cambios de toda la app (lo hacía, 60 veces por segundo, mientras la página estaba abierta).
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
    // 1.5x no se distingue en líneas finas y dibuja hasta un 44% menos de píxeles que 2x.
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
    // Según el scroll: al irse el hero el objeto gira más rápido, sus vértices se separan y la malla pasa
    // del color hueso al de acento. Todo es cálculo por fotograma sobre pocos objetos (barato).
    let target = 0; // 0 arriba, 1 cuando el hero ya salió de pantalla
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

    // Solo dibuja mientras el objeto se ve; fuera de pantalla el bucle se detiene hasta que vuelve.
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
 * Campo de visión vertical que mantiene todo el objeto en cuadro también en horizontal: 45 grados en
 * lienzos anchos y más abierto si el lienzo es más estrecho que alto (p. ej. la columna del hero a
 * 1920px), para que el icosaedro (radio 1.15 más el parallax del puntero) nunca se corte por los lados.
 */
function fitFov(aspect: number): number {
  const halfWidthNeeded = 1.45; // unidades de mundo alrededor del centro
  const distance = 3.4; // z de la cámara
  const fov = (2 * Math.atan(halfWidthNeeded / (distance * aspect)) * 180) / Math.PI;
  return Math.max(45, fov);
}
