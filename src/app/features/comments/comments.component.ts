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
 * Public guestbook: approved comments plus a form that always lands pending moderation
 * (enforced by RLS in migration 0002). Spam guards here are client-side only: a hidden
 * honeypot field and a per-browser cooldown; length limits are enforced by the database.
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
    /** Honeypot: hidden from people, often filled by bots. */
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
      // Pretend success so bots do not learn the field is a trap.
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
      // Storage unavailable (private mode): the database limits still apply.
    }
  }
}
