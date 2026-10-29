import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ModelAsset, ModelAssetMetadata } from '../../core/data/model-asset.model';
import { ModelAssetsService } from '../../core/data/model-assets.service';

const MAX_MODEL_BYTES = 20 * 1024 * 1024;
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

@Component({
  selector: 'app-model-upload',
  standalone: true,
  templateUrl: './model-upload.component.html',
  styleUrl: './model-upload.component.css',
})
export class ModelUploadComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly modelAssets = inject(ModelAssetsService);

  /** `library`: solo subir (página Modelos 3D), sin selector y sin "quitar del bloque". */
  @Input() mode: 'block' | 'library' = 'block';
  @Input() value = '';
  @Input() metadata: ModelAssetMetadata = { title: '', author: '', license: '' };
  @Output() valueChange = new EventEmitter<string>();
  @Output() assetSelected = new EventEmitter<ModelAsset | null>();

  protected readonly uploading = signal(false);
  protected readonly lastUploaded = signal('');
  protected readonly uploadError = signal('');
  protected readonly loadingModels = signal(true);
  protected readonly models = signal<ModelAsset[]>([]);

  ngOnInit(): void {
    if (this.mode === 'library') return;
    this.refreshModels();
  }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set('');
    if (!file.name.toLowerCase().endsWith('.glb')) {
      this.fail(input, 'Formato no permitido. Selecciona un archivo .glb.');
      return;
    }
    if (file.type && !['model/gltf-binary', 'application/octet-stream'].includes(file.type)) {
      this.fail(input, 'El archivo seleccionado no parece ser un modelo GLB.');
      return;
    }
    if (file.size === 0 || file.size > MAX_MODEL_BYTES) {
      this.fail(input, 'El modelo debe pesar entre 1 byte y 20 MB.');
      return;
    }

    this.uploading.set(true);
    try {
      const buffer = await file.arrayBuffer();
      if (!this.isSelfContainedGlb(buffer)) {
        throw new Error('El GLB no es válido o depende de recursos externos.');
      }

      const path = `${crypto.randomUUID()}.glb`;
      const assetMetadata = {
        title: this.metadata.title.trim() || file.name,
        originalName: file.name,
        author: this.metadata.author.trim(),
        license: this.metadata.license.trim(),
      };
      const { error } = await this.supabase.client.storage.from('models').upload(path, buffer, {
        upsert: false,
        contentType: 'model/gltf-binary',
        cacheControl: '3600',
        metadata: assetMetadata,
      });
      if (error) throw error;

      this.value = path;
      this.valueChange.emit(path);
      const uploaded: ModelAsset = {
        path,
        ...assetMetadata,
        size: file.size,
        updatedAt: new Date().toISOString(),
      };
      this.models.update((models) => [uploaded, ...models.filter((model) => model.path !== path)]);
      this.lastUploaded.set(uploaded.title);
      this.assetSelected.emit(uploaded);
    } catch (error) {
      console.error('Failed to upload GLB model to Supabase Storage', error);
      this.uploadError.set(
        error instanceof Error && error.message.includes('external')
          ? 'El GLB debe incluir sus texturas y geometría; no se permiten recursos externos.'
          : 'No se pudo validar o subir el modelo GLB.',
      );
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
    this.assetSelected.emit(null);
    this.uploadError.set('');
  }

  selectExisting(event: Event): void {
    const path = (event.target as HTMLSelectElement).value;
    this.value = path;
    this.valueChange.emit(path);
    this.assetSelected.emit(this.models().find((model) => model.path === path) ?? null);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private refreshModels(): void {
    this.loadingModels.set(true);
    this.modelAssets.list().subscribe({
      next: (models) => {
        this.models.set(models);
        this.loadingModels.set(false);
      },
      error: () => this.loadingModels.set(false),
    });
  }

  private fail(input: HTMLInputElement, message: string): void {
    this.uploadError.set(message);
    input.value = '';
  }

  private isSelfContainedGlb(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 20) return false;
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) return false;
    if (view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== JSON_CHUNK) {
      return false;
    }

    const jsonLength = view.getUint32(12, true);
    if (jsonLength < 2 || 20 + jsonLength > buffer.byteLength) return false;
    try {
      const text = new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim();
      const document = JSON.parse(text) as {
        buffers?: Array<{ uri?: unknown }>;
        images?: Array<{ uri?: unknown }>;
      };
      return !(document.buffers ?? []).some((item) => 'uri' in item) &&
        !(document.images ?? []).some((item) => 'uri' in item);
    } catch {
      return false;
    }
  }
}
