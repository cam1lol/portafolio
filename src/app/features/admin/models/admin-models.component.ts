import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Block } from '../../../core/data/block.model';
import { ModelAsset, ModelAssetMetadata } from '../../../core/data/model-asset.model';
import { BlocksService } from '../../../core/data/blocks.service';
import { ModelAssetsService } from '../../../core/data/model-assets.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ModelUploadComponent } from '../../../shared/model-upload/model-upload.component';

interface ModelAssetRow extends ModelAsset {
  usedBy: string[];
}

@Component({
  selector: 'app-admin-models',
  standalone: true,
  imports: [RouterLink, ModelUploadComponent],
  templateUrl: './admin-models.component.html',
  styleUrl: './admin-models.component.css',
})
export class AdminModelsComponent implements OnInit {
  private readonly modelAssets = inject(ModelAssetsService);
  private readonly blocksService = inject(BlocksService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly models = signal<ModelAssetRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  /** Metadata typed in the "Subir modelo" card, stored with the GLB in Storage. */
  protected readonly uploadMeta = signal<ModelAssetMetadata>({ title: '', author: '', license: '' });

  setMeta(field: keyof ModelAssetMetadata, event: Event): void {
    const value = (event.target as HTMLInputElement).value.slice(0, field === 'license' ? 160 : 120);
    this.uploadMeta.update((meta) => ({ ...meta, [field]: value }));
  }

  onUploaded(asset: ModelAsset | null): void {
    if (!asset) return;
    this.successMessage.set(`"${asset.title}" se agregó a la biblioteca.`);
    this.uploadMeta.set({ title: '', author: '', license: '' });
    this.load();
  }

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  async remove(model: ModelAssetRow): Promise<void> {
    if (model.usedBy.length > 0) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar modelo 3D',
      message: `Se eliminará "${model.title}" (${model.originalName}) de la biblioteca. Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;

    this.errorMessage.set('');
    this.successMessage.set('');
    this.modelAssets.remove(model.path).subscribe({
      next: () => {
        this.models.update((models) => models.filter((item) => item.path !== model.path));
        this.successMessage.set('El modelo se eliminó de la biblioteca.');
      },
      error: () => this.errorMessage.set('No se pudo eliminar el modelo. Comprueba tu sesión de administrador.'),
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({ models: this.modelAssets.list(), blocks: this.blocksService.getAll() }).subscribe({
      next: ({ models, blocks }) => {
        this.models.set(models.map((model) => ({ ...model, usedBy: this.references(model, blocks) })));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la biblioteca. Comprueba que el bucket models permite listar archivos a tu sesión.');
        this.loading.set(false);
      },
    });
  }

  private references(model: ModelAsset, blocks: Block[]): string[] {
    return blocks
      .filter((block) => block.config['modelPath'] === model.path)
      .map((block) => {
        const title = block.config['title'];
        return typeof title === 'string' && title.trim() ? title : `Galería 3D · ${block.page}`;
      });
  }
}
