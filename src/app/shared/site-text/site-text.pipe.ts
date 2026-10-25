import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SiteContentService } from '../../core/data/site-content.service';

/**
 * `'hero_l1' | siteText` resolves a public text in this order:
 * 1. `site_content` row for the active language (admin-editable),
 * 2. the i18n key of the same name,
 * 3. the optional `fallback` argument (for keys that never existed in i18n).
 *
 * Impure on purpose, like `TranslocoPipe`: it must re-run when the language,
 * the i18n JSON or the Supabase content finish loading.
 */
@Pipe({ name: 'siteText', standalone: true, pure: false })
export class SiteTextPipe implements PipeTransform {
  private readonly siteContent = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.siteContent.ensureLoaded();
  }

  transform(key: string, fallback = ''): string {
    const row = this.siteContent.content()[key];
    const value = row ? (this.transloco.getActiveLang() === 'en' ? row.en : row.es) : '';
    if (value.trim()) return value;

    const translated = this.transloco.translate(key);
    return translated && translated !== key ? translated : fallback;
  }
}
