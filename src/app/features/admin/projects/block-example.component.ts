import { Component, computed, input } from '@angular/core';
import { Project } from '../../../core/data/project.model';
import { ProjectPageComponent } from '../../project-page/project-page.component';
import { ExampleSection, withExample } from './block-examples';

/**
 * "¿Cómo se ve?": one section of the real project page, rendered by the public component itself.
 * With your content when the section has some (updates as you type), else with an example tagged
 * EJEMPLO so you know what the block is for before filling it.
 */
@Component({
  selector: 'app-block-example',
  standalone: true,
  imports: [ProjectPageComponent],
  template: `
    <div class="ex-bar mono">
      @if (view().isExample) {
        <span class="tag example">EJEMPLO</span> Así se verá esta sección en la página del proyecto cuando la rellenes.
      } @else {
        <span class="tag live">EN VIVO</span> Tu contenido, tal como lo verán los visitantes.
      }
    </div>
    @defer {
      <div class="ex-page" inert>
        <app-project-page [previewProject]="view().project" [focusSection]="section()" />
      </div>
    } @placeholder {
      <p class="ex-loading mono">CARGANDO…</p>
    }
  `,
  styles: `
    :host { display: block; margin: 8px 0 18px; overflow: hidden; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); }
    .ex-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid var(--line); color: var(--steel); font-size: 10px; letter-spacing: .06em; }
    .tag { padding: 2px 8px; border-radius: 999px; font-size: 9px; letter-spacing: .12em; }
    .tag.example { border: 1px dashed var(--ember); color: var(--ember); }
    .tag.live { border: 1px solid var(--good); color: var(--good); }
    .ex-page { max-height: 560px; overflow: auto; overscroll-behavior: contain; }
    .ex-loading { padding: 18px; color: var(--steel); font-size: 10px; }
  `,
})
export class BlockExampleComponent {
  readonly project = input.required<Project>();
  readonly section = input.required<ExampleSection>();
  protected readonly view = computed(() => withExample(this.project(), this.section()));
}
