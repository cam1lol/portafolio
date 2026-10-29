import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SiteContentService } from '../../core/data/site-content.service';

/**
 * `'hero_l1' | siteText` resuelve un texto público en este orden:
 * 1. la fila de `site_content` del idioma activo (editable en el admin),
 * 2. la clave i18n del mismo nombre,
 * 3. el argumento opcional `fallback` (para claves que nunca existieron en i18n).
 *
 * Impuro a propósito, como `TranslocoPipe`: debe volver a ejecutarse cuando terminan de cargar el
 * idioma, el JSON de i18n o el contenido de Supabase.
 */
@Pipe({ name: 'siteText', standalone: true, pure: false })
export class SiteTextPipe implements PipeTransform {
  private readonly siteContent = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.siteContent.ensureLoaded();
  }

  transform(key: string, fallback = ''): string {
    const lang = this.transloco.getActiveLang();
    const row = this.siteContent.content()[key];
    const value = row ? (lang === 'en' ? row.en : row.es) : '';
    if (value.trim()) return value;

    // Lee el diccionario cargado directamente: translate() con una clave que solo vive en Supabase
    // (contact_email, hero_m1_value...) dispara el aviso de clave ausente de Transloco, y este pipe impuro
    // corre en cada detección de cambios, llenando la consola.
    const translated = this.transloco.getTranslation(lang)[key];
    return typeof translated === 'string' && translated ? translated : fallback;
  }
}
