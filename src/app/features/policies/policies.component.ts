import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { POLICIES_OWNER, POLICIES_UPDATED, POLICY_SECTIONS, PolicyBlock, PolicySection } from './policies.content';

/**
 * Políticas (/politicas): privacidad y tratamiento de datos, almacenamiento local y propiedad
 * intelectual, en un solo documento con un índice lateral que sigue la lectura.
 */
@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.css',
})
export class PoliciesComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly en = computed(() => this.lang() === 'en');

  protected readonly sections = POLICY_SECTIONS;
  protected readonly owner = POLICIES_OWNER;
  protected readonly active = signal(POLICY_SECTIONS[0].id);
  protected readonly updated = computed(() =>
    new Date(`${POLICIES_UPDATED}T12:00:00`).toLocaleDateString(this.en() ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
  );

  private readonly sectionEls = viewChildren<ElementRef<HTMLElement>>('section');

  constructor() {
    const title = inject(Title);
    const heading = toSignal(this.transloco.selectTranslate('pol_title'), { initialValue: '' });
    effect(() => title.setTitle(heading() ? `${heading()} · Camilo Ayala` : 'Camilo Ayala'));

    // El índice marca la sección que se está leyendo: la que cruza el tercio superior de la pantalla.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          const hit = entries.find((entry) => entry.isIntersecting);
          if (hit) this.active.set(hit.target.id);
        },
        { rootMargin: '-25% 0px -65% 0px' },
      );
      this.sectionEls().forEach((el) => observer.observe(el.nativeElement));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected pad(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  protected title(section: PolicySection): string {
    return this.en() ? section.titleEn : section.titleEs;
  }

  protected text(block: PolicyBlock): string {
    return this.en() ? block.textEn : block.textEs;
  }

  protected items(block: PolicyBlock): string[] {
    return (this.en() ? block.itemsEn : block.itemsEs) ?? [];
  }
}
