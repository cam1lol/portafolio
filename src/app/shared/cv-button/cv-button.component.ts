import { Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SiteContentService } from '../../core/data/site-content.service';
import { SiteTextPipe } from '../site-text/site-text.pipe';
import { MagneticDirective } from '../directives/magnetic.directive';

/**
 * Botón "Descargar CV": abre el PDF del idioma activo (el inglés recurre al español), subido en
 * Textos del sitio > CV. No pinta nada hasta que exista un PDF.
 */
@Component({
  selector: 'app-cv-button',
  standalone: true,
  imports: [SiteTextPipe, MagneticDirective],
  template: `
    @if (url(); as href) {
      <a class="btn mag fx-fill" [href]="href" target="_blank" rel="noopener" download appMagnetic>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        {{ 'cta2' | siteText }}
      </a>
    }
  `,
  // Mismo aspecto que el botón secundario del hero (los estilos de botón van por componente).
  styles: `
    :host { display: contents; }
    .btn {
      display: inline-flex; align-items: center; gap: 9px; padding: 13px 20px;
      border: 1px solid var(--line); border-radius: var(--r); background: transparent; color: var(--bone);
      font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
      text-decoration: none; cursor: pointer; transition: all .2s;
    }
    .btn svg { width: 15px; height: 15px; }
    .btn:hover { border-color: var(--bone); }
    .btn:focus-visible { outline: 2px solid var(--ember); outline-offset: 3px; }
  `,
})
export class CvButtonComponent {
  private readonly content = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.content.ensureLoaded();
  }

  protected readonly url = computed(() => this.content.valueFor('cv_url', this.transloco.activeLang()));
}
