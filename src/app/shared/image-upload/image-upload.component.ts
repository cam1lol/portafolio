import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Component({
  selector: 'app-image-upload',
  standalone: true,
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.css',
})
export class ImageUploadComponent {
  private readonly supabase = inject(SupabaseService);

  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  protected readonly uploading = signal(false);
  protected readonly uploadError = signal('');

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadError.set('');

    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension) {
      this.uploadError.set('Formato no permitido. Usa JPG, PNG o WebP.');
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      this.uploadError.set('La imagen supera el límite de 5 MB.');
      input.value = '';
      return;
    }

    this.uploading.set(true);

    try {
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await this.supabase.client.storage
        .from('previews')
        .upload(path, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data } = this.supabase.client.storage.from('previews').getPublicUrl(path);
      this.value = data.publicUrl;
      this.valueChange.emit(data.publicUrl);
    } catch (err) {
      console.error('Failed to upload preview image to Supabase Storage', err);
      this.uploadError.set('Error al subir la imagen.');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  onUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    this.value = url;
    this.valueChange.emit(url);
  }

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
  }
}
