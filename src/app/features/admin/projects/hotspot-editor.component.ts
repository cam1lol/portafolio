import { Component, ElementRef, afterNextRender, Injector, inject, input, signal, viewChild } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MAX_HOTSPOTS } from '../../../core/data/project-details';
import { AutoTranslateDirective } from '../shared/auto-translate.directive';
import { HotspotGroup, hotspotGroup } from './project-details.form';

const round = (value: number) => Math.min(100, Math.max(0, Math.round(value * 10) / 10));

/**
 * Points of interest on the card image (A8). Click the image to add a point, drag a point (or focus
 * it and use the arrow keys) to move it, and write its label below. Points without a label are not
 * saved.
 */
@Component({
  selector: 'app-hotspot-editor',
  standalone: true,
  imports: [ReactiveFormsModule, AutoTranslateDirective],
  template: `
    <div class="canvas" #canvas (click)="add($event)">
      <img [src]="image()" alt="" draggable="false" />
      @for (spot of spots().controls; track spot; let i = $index) {
        <button type="button" class="pin mono" [class.on]="selected() === i" [style.left.%]="spot.controls.x.value" [style.top.%]="spot.controls.y.value"
          [attr.aria-label]="'Punto ' + (i + 1) + ', usa las flechas para moverlo'"
          (click)="$event.stopPropagation(); select(i)" (pointerdown)="startDrag($event, i)" (keydown)="nudge($event, i)">{{ i + 1 }}</button>
      }
    </div>
    <p class="help">
      @if (spots().length < max) { Haz clic sobre la imagen para poner un punto. } @else { Máximo {{ max }} puntos. }
      Arrastra un punto para moverlo. Solo se guardan los que tienen texto.
    </p>

    <ol class="list">
      @for (spot of spots().controls; track spot; let i = $index) {
        <li [formGroup]="spot" [class.on]="selected() === i">
          <span class="no mono">{{ i + 1 }}</span>
          <input [id]="'spot-es-' + i" formControlName="labelEs" appAutoTranslate maxlength="80" placeholder="Qué se ve aquí (ES)" aria-label="Texto del punto en español" (focus)="select(i)" />
          <input formControlName="labelEn" maxlength="80" placeholder="English" aria-label="Texto del punto en inglés" (focus)="select(i)" />
          <button type="button" class="remove" (click)="remove(i)" [attr.aria-label]="'Quitar punto ' + (i + 1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </li>
      }
    </ol>
  `,
  styles: `
    :host { display: block; }
    .canvas { position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: var(--r); background: var(--ink); cursor: crosshair; user-select: none; touch-action: none; }
    .canvas img { display: block; width: 100%; height: auto; pointer-events: none; }
    .pin {
      position: absolute; display: grid; place-items: center; width: 26px; height: 26px; margin: -13px 0 0 -13px; padding: 0;
      border: 2px solid var(--ink); border-radius: 50%; background: var(--ember); color: var(--ink); font-size: 11px; font-weight: 700; cursor: grab;
    }
    .pin.on { outline: 2px solid var(--bone); outline-offset: 2px; }
    .pin:focus-visible { outline: 2px solid var(--bone); outline-offset: 2px; }
    .help { margin: 8px 0 12px; color: var(--steel); font-size: 12px; }
    .list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .list li { display: grid; grid-template-columns: 26px minmax(0, 1fr) minmax(0, 1fr) 34px; gap: 8px; align-items: center; padding: 6px; border: 1px solid var(--line); border-radius: var(--r); }
    .list li.on { border-color: var(--ember); }
    .no { color: var(--ember); font-size: 11px; text-align: center; }
    .remove { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--line); border-radius: var(--r); background: none; color: var(--steel); cursor: pointer; }
    .remove:hover, .remove:focus-visible { border-color: var(--ember); color: var(--ember); outline: none; }
    .remove svg { width: 14px; height: 14px; }
    @media (max-width: 620px) { .list li { grid-template-columns: 26px minmax(0, 1fr) 34px; } .list li input + input { grid-column: 2; } }
  `,
})
export class HotspotEditorComponent {
  readonly image = input.required<string>();
  readonly spots = input.required<FormArray<HotspotGroup>>();

  protected readonly max = MAX_HOTSPOTS;
  protected readonly selected = signal<number | null>(null);
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly injector = inject(Injector);
  private dragged = false;

  protected select(index: number): void {
    this.selected.set(index);
  }

  protected add(event: MouseEvent): void {
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    const spots = this.spots();
    if (spots.length >= MAX_HOTSPOTS) return;
    const { x, y } = this.position(event);
    spots.push(hotspotGroup({ x, y }));
    spots.markAsDirty();
    const index = spots.length - 1;
    this.selected.set(index);
    afterNextRender(() => document.getElementById(`spot-es-${index}`)?.focus(), { injector: this.injector });
  }

  protected remove(index: number): void {
    this.spots().removeAt(index);
    this.spots().markAsDirty();
    this.selected.set(null);
  }

  protected startDrag(event: PointerEvent, index: number): void {
    const pin = event.target as HTMLElement;
    pin.setPointerCapture(event.pointerId);
    this.selected.set(index);
    const group = this.spots().at(index);
    const move = (e: PointerEvent) => {
      this.dragged = true;
      const { x, y } = this.position(e);
      group.patchValue({ x, y });
    };
    const up = () => {
      pin.removeEventListener('pointermove', move);
      pin.removeEventListener('pointerup', up);
      pin.removeEventListener('pointercancel', up);
      if (this.dragged) this.spots().markAsDirty();
      // The click that follows a drag must not add a point.
      setTimeout(() => (this.dragged = false));
    };
    pin.addEventListener('pointermove', move);
    pin.addEventListener('pointerup', up);
    pin.addEventListener('pointercancel', up);
  }

  protected nudge(event: KeyboardEvent, index: number): void {
    const step = event.shiftKey ? 5 : 1;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    const group = this.spots().at(index);
    group.patchValue({ x: round(group.controls.x.value + delta[0]), y: round(group.controls.y.value + delta[1]) });
    this.spots().markAsDirty();
  }

  private position(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    return { x: round(((event.clientX - rect.left) / rect.width) * 100), y: round(((event.clientY - rect.top) / rect.height) * 100) };
  }
}
