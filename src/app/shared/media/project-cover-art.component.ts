import { Component, input } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

/**
 * Portada generada para un proyecto sin imagen ni clip, para que su tarjeta mantenga la misma altura y
 * estructura que las demás hasta que tenga medios reales: un panel HUD (rejilla técnica estática,
 * marcas de esquina), el icono del proyecto en grande con su movimiento y las iniciales (la etiqueta
 * de tipo ya está en la tarjeta). Solo se mueve el icono; el resto se pinta una vez.
 */
@Component({
  selector: 'app-project-cover-art',
  standalone: true,
  imports: [IconComponent],
  template: `
    <span class="grid" aria-hidden="true"></span>
    <span class="tick tl" aria-hidden="true"></span><span class="tick br" aria-hidden="true"></span>
    <span class="initials" aria-hidden="true">{{ initials() }}</span>
    <span class="emblem" aria-hidden="true"><app-icon [name]="icon()" animated /></span>
  `,
  styles: `
    :host { position: absolute; inset: 0; display: block; overflow: hidden; background: radial-gradient(120% 90% at 70% 30%, #1a1410 0%, var(--ink) 60%); color: var(--ember); }
    .grid {
      position: absolute; inset: 0; opacity: .5;
      background-image: linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
      background-size: 28px 28px; background-position: center;
    }
    .tick { position: absolute; width: 14px; height: 14px; border-color: var(--steel); border-style: solid; opacity: .7; }
    .tl { top: 10px; left: 10px; border-width: 1px 0 0 1px; }
    .br { right: 10px; bottom: 10px; border-width: 0 1px 1px 0; }
    .initials { position: absolute; right: 16px; bottom: 6px; color: var(--line); font: 900 clamp(48px, 9vw, 96px) / 1 'Archivo', sans-serif; letter-spacing: -.04em; }
    .emblem { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 76px; height: 76px; translate: -50% -50%; border: 1px solid var(--line); background: rgba(10, 11, 13, .6); }
    .emblem app-icon { width: 34px; height: 34px; }
  `,
})
export class ProjectCoverArtComponent {
  readonly icon = input('box');
  readonly name = input('');

  /** "Gestion Empresarial" -> GE; una sola palabra ("chatBot", "Crud_usuarios") -> sus dos primeras letras. */
  protected initials(): string {
    const words = this.name().split(/[\s_-]+/).filter(Boolean);
    const letters = words.length > 1 ? words.slice(0, 2).map((word) => word[0]) : [...(words[0] ?? '')].slice(0, 2);
    return letters.join('').toUpperCase();
  }
}
