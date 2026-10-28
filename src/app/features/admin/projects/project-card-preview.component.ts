import { Component, input } from '@angular/core';
import { IconComponent } from '../../../shared/icons/icon.component';
import { ProjectCoverArtComponent } from '../../../shared/media/project-cover-art.component';

const STATUS_LABELS = { live: 'EN VIVO', wip: 'EN PROGRESO', archive: 'ARCHIVADO' } as const;

/**
 * Live miniature of the home page card while the project is being edited: same structure and
 * tokens as the public card (media strip, animated icon, type label, name, summary, stack, status),
 * without the hover and transition machinery. Shows the Spanish summary.
 */
@Component({
  selector: 'app-project-card-preview',
  standalone: true,
  imports: [IconComponent, ProjectCoverArtComponent],
  template: `
    <span class="pv-label mono">VISTA PREVIA DE LA TARJETA</span>
    <div class="card" aria-hidden="true">
      <div class="media">
        @if (previewVideo()) {
          <video [src]="previewVideo()" [style.object-position]="focus()" [attr.poster]="previewImage() || null" muted loop playsinline autoplay></video>
        } @else if (previewImage()) {
          <img [src]="previewImage()" [style.object-position]="focus()" alt="" />
        } @else {
          <app-project-cover-art [icon]="icon() || 'box'" [name]="name()" />
        }
        @if ((previewVideo() || previewImage()) && icon()) {
          <span class="ic"><app-icon [name]="icon()" animated /></span>
        }
      </div>
      <div class="ptype mono">{{ typeLabel() || 'ETIQUETA DE TIPO' }}</div>
      <h3 [class.placeholder]="!name()">{{ name() || 'Nombre del proyecto' }}</h3>
      <p class="pd" [class.placeholder]="!summary()">{{ summary() || 'El resumen en español aparece aquí.' }}</p>
      @if (stack().length) {
        <div class="stack">
          @for (item of stack(); track $index) { <span class="chip">{{ item }}</span> }
        </div>
      }
      <div class="st mono"><span class="dot" [class]="status()"></span>{{ statusLabel() }}</div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .pv-label { display: block; margin-bottom: 10px; color: var(--steel); font-size: 10px; letter-spacing: .12em; }
    .card { position: relative; overflow: hidden; padding: 20px; border: 1px solid var(--line); border-radius: var(--r); background: var(--graphite); }
    .media { position: relative; margin: -20px -20px 16px; aspect-ratio: 16 / 9; overflow: hidden; border-bottom: 1px solid var(--line); background: var(--ink); }
    .media video, .media img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .ic { position: absolute; top: 10px; left: 10px; display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid rgba(242, 84, 27, .55); background: rgba(10, 11, 13, .88); }
    .ic app-icon { width: 17px; height: 17px; color: var(--ember); }
    .ptype { margin-bottom: 10px; color: var(--steel); font-size: 10px; letter-spacing: .1em; }
    h3 { margin: 0 0 6px; font: 800 18px/1.2 'Archivo', sans-serif; letter-spacing: -.01em; overflow-wrap: anywhere; }
    .pd { margin: 0; color: var(--bone-dim); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
    .placeholder { color: var(--steel); font-style: italic; }
    .stack { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .st { display: flex; align-items: center; gap: 6px; margin-top: 14px; color: var(--steel); font-size: 10px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot.live { background: var(--good); }
    .dot.wip { background: var(--ember); }
    .dot.archive { background: var(--steel); }
  `,
})
export class ProjectCardPreviewComponent {
  readonly name = input('');
  readonly summary = input('');
  readonly typeLabel = input('');
  readonly icon = input('');
  readonly stack = input<string[]>([]);
  readonly status = input<'live' | 'wip' | 'archive'>('wip');
  readonly previewImage = input('');
  readonly previewVideo = input('');
  readonly focus = input('50% 50%');

  protected statusLabel(): string {
    return STATUS_LABELS[this.status()];
  }
}
