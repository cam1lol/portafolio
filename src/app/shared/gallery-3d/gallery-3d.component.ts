import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SupabaseService } from '../../core/supabase/supabase.service';

const MAX_MODEL_BYTES = 20 * 1024 * 1024;
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const MODEL_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.glb$/i;

@Component({
  selector: 'app-gallery-3d',
  standalone: true,
  templateUrl: './gallery-3d.component.html',
  styleUrl: './gallery-3d.component.css',
})
export class Gallery3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('viewer');
  private readonly supabase = inject(SupabaseService);

  @Input() modelPath = '';
  @Input() label = 'Visor de modelo 3D';
  @Input() height: 'compact' | 'standard' | 'tall' = 'standard';
  @Input() autoRotate = true;
  @Input() zoomEnabled = true;
  @Input() showBorder = false;
  @Input() surface = false;
  @Input() surfaceOpacity = '35%';

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private model?: THREE.Object3D;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private rafId?: number;
  private loadVersion = 0;
  private viewReady = false;
  private visible = true;

  ngAfterViewInit(): void {
    this.viewReady = true;
    try {
      this.initViewer();
      void this.loadModel();
    } catch (error) {
      console.error('Could not initialize the 3D viewer', error);
      this.loading.set(false);
      this.errorMessage.set('Este navegador no pudo iniciar el visor 3D.');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && changes['modelPath']) void this.loadModel();
    if (this.viewReady && (changes['height'] || changes['autoRotate'] || changes['zoomEnabled'])) {
      if (this.controls) {
        this.controls.autoRotate = this.autoRotate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.controls.enableZoom = this.zoomEnabled;
      }
      if (changes['height']) this.resize();
    }
  }

  ngOnDestroy(): void {
    this.loadVersion += 1;
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.controls?.dispose();
    if (this.model) this.disposeObject(this.model);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  private initViewer(): void {
    const host = this.host().nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);
    scene.add(new THREE.HemisphereLight(0xe9eaed, 0x171a21, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xf2541b, 1.1);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);

    this.scene = scene;
    this.camera = camera;
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12;
    this.controls.autoRotate = this.autoRotate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controls.enableZoom = this.zoomEnabled;
    this.controls.autoRotateSpeed = 1.1;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.visible ? this.startRenderLoop() : this.stopRenderLoop();
      });
      this.intersectionObserver.observe(host);
    }
    this.startRenderLoop();
  }

  private async loadModel(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.errorMessage.set('');
    if (this.model) {
      this.scene?.remove(this.model);
      this.disposeObject(this.model);
      this.model = undefined;
    }

    if (!MODEL_PATH.test(this.modelPath)) {
      this.loading.set(false);
      this.errorMessage.set('Esta galería todavía no tiene un modelo GLB válido.');
      return;
    }

    try {
      const { data, error } = await this.supabase.client.storage.from('models').download(this.modelPath);
      if (error || !data) throw error ?? new Error('Model file is missing.');
      const buffer = await data.arrayBuffer();
      if (!this.isSelfContainedGlb(buffer)) {
        throw new Error('The model contains external resources or has an invalid GLB structure.');
      }
      if (version !== this.loadVersion) return;

      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        new GLTFLoader().parse(buffer, '', resolve, reject);
      });
      if (version !== this.loadVersion) {
        this.disposeObject(gltf.scene);
        return;
      }

      const model = gltf.scene;
      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);
      if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
        this.disposeObject(model);
        throw new Error('The model has no visible geometry.');
      }

      model.scale.setScalar(2.4 / maxDimension);
      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.sub(scaledBox.getCenter(new THREE.Vector3()));
      this.scene?.add(model);
      this.model = model;
      this.loading.set(false);
    } catch (error) {
      if (version !== this.loadVersion) return;
      console.error('Could not load GLB model', error);
      this.loading.set(false);
      this.errorMessage.set('No se pudo cargar el modelo. Comprueba que el archivo sea un GLB válido.');
    }
  }

  private isSelfContainedGlb(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 20 || buffer.byteLength > MAX_MODEL_BYTES) return false;
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) return false;
    if (view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== JSON_CHUNK) return false;
    const jsonLength = view.getUint32(12, true);
    if (jsonLength < 2 || 20 + jsonLength > buffer.byteLength) return false;

    try {
      const text = new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim();
      const document = JSON.parse(text) as {
        buffers?: Array<{ uri?: unknown }>;
        images?: Array<{ uri?: unknown }>;
        accessors?: Array<{ count?: number }>;
        meshes?: unknown[];
        nodes?: unknown[];
      };
      const hasExternalResources = [...(document.buffers ?? []), ...(document.images ?? [])]
        .some((resource) => 'uri' in resource);
      const totalAccessorCount = (document.accessors ?? []).reduce(
        (total, accessor) => total + (typeof accessor.count === 'number' ? accessor.count : 0),
        0,
      );
      return !hasExternalResources && totalAccessorCount <= 1_000_000 &&
        (document.meshes?.length ?? 0) <= 100 && (document.nodes?.length ?? 0) <= 500;
    } catch {
      return false;
    }
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const host = this.host().nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startRenderLoop(): void {
    if (!this.visible || this.rafId !== undefined || !this.renderer || !this.scene || !this.camera) return;
    const render = () => {
      if (!this.visible || !this.renderer || !this.scene || !this.camera) {
        this.rafId = undefined;
        return;
      }
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  private stopRenderLoop(): void {
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  private disposeObject(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        material.dispose();
      }
    });
  }
}
