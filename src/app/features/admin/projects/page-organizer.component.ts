import { AfterViewInit, Component, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Project } from '../../../core/data/project.model';
import { PAGE_SECTIONS, effectiveSectionOrder } from '../../../core/data/project-details';
import { ProjectPageComponent } from '../../project-page/project-page.component';

/** Si una sección movible se verá en la página con el proyecto tal como está ahora. */
function sectionHasContent(p: Project, id: string): boolean {
  switch (id) {
    case 's-demo': return !!p.demoVideoUrl && !!(p.previewVideo || p.previewImage);
    case 's-story': return Object.values(p.story).some((value) => value.trim());
    case 's-results': return p.results.length > 0;
    case 's-devices': return !!p.mobileVideo.trim() || p.mobileImages.some((src) => src.trim());
    case 's-hotspots': return !!p.previewImage?.trim() && p.hotspots.some((spot) => spot.labelEs.trim() || spot.labelEn.trim());
    case 's-overview': return !!(p.longEs.trim() || p.highlightsEs.length || p.stack.length);
    case 's-how': return !!p.caseStudyEs.trim();
    case 's-chapters': return p.chapters.length > 0;
    case 's-videos': return p.videos.length > 0;
    case 's-screens': return p.screens.length > 0;
    case 's-gallery': return p.gallery.length > 0;
    case 's-extras': return p.improvements.length + p.docs.length + p.versions.length > 0;
    default: return false;
  }
}

/**
 * "Organizar la página": el orden de las secciones de la página del proyecto. Arrastra las filas (o usa
 * las flechas), mira cómo se mueve el esquema y comprueba la página real a la derecha. Las secciones
 * vacías conservan su sitio pero no se ven hasta tener contenido. El orden se guarda con el proyecto.
 */
@Component({
  selector: 'app-page-organizer',
  standalone: true,
  imports: [ProjectPageComponent],
  templateUrl: './page-organizer.component.html',
  styleUrl: './page-organizer.component.css',
})
export class PageOrganizerComponent implements AfterViewInit {
  readonly project = input.required<Project>();
  readonly order = input<string[]>([]);
  readonly orderChange = output<string[]>();
  readonly closed = output<void>();

  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly preview = viewChild<ElementRef<HTMLElement>>('preview');

  protected readonly current = signal<string[]>([]);
  protected readonly selected = signal<string | null>(null);
  private dragged: string | null = null;

  protected readonly rows = computed(() =>
    this.current().map((id) => ({
      id,
      label: PAGE_SECTIONS.find((section) => section.id === id)?.label ?? id,
      filled: sectionHasContent(this.project(), id),
    })),
  );
  protected readonly previewProject = computed<Project>(() => ({ ...this.project(), sectionOrder: this.current() }));

  ngAfterViewInit(): void {
    this.current.set(effectiveSectionOrder(this.order()));
    this.dialog().nativeElement.showModal();
  }

  protected move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    const order = [...this.current()];
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.apply(order, order[target]);
  }

  protected reset(): void {
    this.apply(effectiveSectionOrder([]), null);
  }

  // ---- Arrastrar y soltar (ratón); las flechas hacen lo mismo con teclado o táctil.

  protected onDragStart(event: DragEvent, id: string): void {
    this.dragged = id;
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOver(event: DragEvent, id: string): void {
    if (!this.dragged || this.dragged === id) return;
    event.preventDefault();
    const order = this.current().filter((other) => other !== this.dragged);
    order.splice(order.indexOf(id) + (this.current().indexOf(this.dragged) < this.current().indexOf(id) ? 1 : 0), 0, this.dragged);
    if (order.join() !== this.current().join()) this.apply(order, this.dragged);
  }

  protected onDragEnd(): void {
    this.dragged = null;
  }

  protected select(id: string): void {
    this.selected.set(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.preview()?.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  protected done(): void {
    this.orderChange.emit(this.current());
    this.dialog().nativeElement.close();
  }

  protected onClose(): void {
    this.closed.emit();
  }

  /**
   * Orden nuevo con animación FLIP: las filas y los bloques del esquema se deslizan de donde estaban a
   * donde van (solo transform, apto para el compositor).
   */
  private apply(order: string[], focus: string | null): void {
    const host = this.dialog().nativeElement;
    const before = new Map<Element, DOMRect>();
    host.querySelectorAll('[data-flip]').forEach((el) => before.set(el, el.getBoundingClientRect()));
    this.current.set(order);
    if (focus) this.selected.set(focus);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    afterNextRender(
      () => {
        host.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
          const old = before.get(el);
          if (!old) return;
          const dy = old.top - el.getBoundingClientRect().top;
          if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2, .7, .2, 1)' });
        });
      },
      { injector: this.injector },
    );
  }
}
