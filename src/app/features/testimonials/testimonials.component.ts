import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { CollectionsService } from '../../core/data/collections.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  photo: string;
  initials: string;
}

/** Citas de clientes y colegas (admin > Testimonios, migración 0012). No pinta nada si está vacío. */
@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [RevealDirective, SectionHeadComponent],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.css',
})
export class TestimonialsComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly rows = toSignal(inject(CollectionsService).getPublished('testimonials'), { initialValue: null });

  protected readonly items = computed<Testimonial[]>(() => {
    const en = this.transloco.activeLang() === 'en';
    return (this.rows() ?? []).map((row) => {
      const pick = (base: string) => String((en && row[`${base}_en`]) || row[`${base}_es`] || '').trim();
      const author = String(row['author'] ?? '').trim();
      return {
        id: row.id,
        quote: pick('quote'),
        author,
        role: pick('role'),
        company: String(row['company'] ?? '').trim(),
        photo: String(row['photo'] ?? ''),
        initials: initialsOf(author),
      };
    });
  });

  protected index(position: number): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(position + 1)} / ${pad(this.items().length)}`;
  }
}

/** "María Fernanda López" -> "ML". */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
