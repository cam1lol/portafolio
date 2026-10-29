import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CommentRow, CommentsService } from '../../core/data/comments.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SectionHeadComponent } from '../../shared/section-head/section-head.component';
import { noControlCharsValidator } from '../../shared/validators/no-control-chars.validator';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error' | 'wait';

const COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = 'comments:last-sent';

/**
 * Libro de visitas: comentarios aprobados y un formulario cuyos envíos siempre quedan pendientes de
 * moderar (lo asegura RLS, migración 0002). Las protecciones contra spam de aquí son solo del cliente:
 * un campo trampa oculto y una espera por navegador; los límites de longitud los pone la base de datos.
 */
@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, UpperCasePipe, TranslocoPipe, RevealDirective, SectionHeadComponent],
  templateUrl: './comments.component.html',
  styleUrl: './comments.component.css',
})
export class CommentsComponent implements OnInit {
  private readonly commentsService = inject(CommentsService);
  private readonly transloco = inject(TranslocoService);

  protected readonly comments = signal<CommentRow[]>([]);
  protected readonly state = signal<SubmitState>('idle');

  protected readonly form = new FormGroup({
    author: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80), noControlCharsValidator()],
    }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000), noControlCharsValidator({ allowNewlines: true })],
    }),
    /** Trampa: oculta para las personas, los bots suelen rellenarla. */
    website: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.commentsService.getApproved().subscribe((rows) => this.comments.set(rows ?? []));
  }

  protected invalid(name: 'author' | 'body'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  submit(): void {
    if (this.state() === 'sending') return;
    this.form.markAllAsTouched();

    const { author, body, website } = this.form.getRawValue();
    if (website) {
      // Simula éxito para que los bots no aprendan que el campo es una trampa.
      this.state.set('sent');
      this.form.reset();
      return;
    }
    if (this.form.invalid || !author.trim() || !body.trim()) return;
    if (this.inCooldown()) {
      this.state.set('wait');
      return;
    }

    const lang = this.transloco.getActiveLang() === 'en' ? 'en' : 'es';
    this.state.set('sending');
    this.commentsService.submit(author.trim(), body.trim(), lang).subscribe({
      next: () => {
        this.rememberSend();
        this.form.reset();
        this.state.set('sent');
      },
      error: () => this.state.set('error'),
    });
  }

  private inCooldown(): boolean {
    try {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
      return Date.now() - last < COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  private rememberSend(): void {
    try {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    } catch {
      // Almacenamiento no disponible (modo privado): los límites de la base de datos siguen aplicando.
    }
  }
}
