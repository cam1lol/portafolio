import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { ModelAsset } from './model-asset.model';

@Injectable({ providedIn: 'root' })
export class ModelAssetsService {
  private readonly supabase = inject(SupabaseService);

  list(): Observable<ModelAsset[]> {
    return from(
      this.supabase.client.storage.from('models').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Failed to list GLB models from Supabase Storage', error);
          throw error;
        }

        return (data ?? [])
          .filter((file) => file.name.toLowerCase().endsWith('.glb') && file.id)
          .map((file) => {
            const metadata = (file.metadata ?? {}) as Record<string, unknown>;
            return {
              path: file.name,
              title: this.stringValue(metadata['title']) || file.name,
              originalName: this.stringValue(metadata['originalName']) || file.name,
              author: this.stringValue(metadata['author']),
              license: this.stringValue(metadata['license']),
              size: typeof metadata['size'] === 'number' ? metadata['size'] : 0,
              updatedAt: file.updated_at ?? file.created_at ?? '',
            } satisfies ModelAsset;
          });
      }),
    );
  }

  remove(path: string): Observable<void> {
    return from(this.supabase.client.storage.from('models').remove([path])).pipe(
      map(({ error }) => {
        if (error) {
          console.error('Failed to remove GLB model from Supabase Storage', error);
          throw error;
        }
      }),
    );
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
