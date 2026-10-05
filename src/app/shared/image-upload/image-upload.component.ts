import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';

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
    this.uploading.set(true);

    try {
      const path = `${crypto.randomUUID()}-${file.name}`;
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
