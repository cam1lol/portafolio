import { AfterViewInit, Component, ElementRef, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ContactService, ContactSubmitResult } from '../../core/data/contact.service';
import { noControlCharsValidator } from '../../shared/validators/no-control-chars.validator';

type ModalState = 'idle' | 'sending' | ContactSubmitResult;

const EMAIL_PATTERN = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;

/**
 * Contact dialog. Rendered only while open (the parent wraps it in @if), so it takes focus on
 * creation and hands it back to `returnFocusTo` when it closes.
 */
@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.css',
})
export class ContactModalComponent implements AfterViewInit {
  private readonly contactService = inject(ContactService);
  private readonly transloco = inject(TranslocoService);

  readonly returnFocusTo = input<HTMLElement | null>(null);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly firstField = viewChild.required<ElementRef<HTMLInputElement>>('firstField');

  protected readonly state = signal<ModalState>('idle');

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80), noControlCharsValidator()] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(254), Validators.pattern(EMAIL_PATTERN)],
    }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120), noControlCharsValidator()] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(5000), noControlCharsValidator({ allowNewlines: true })],
    }),
    website: new FormControl('', { nonNullable: true }),
  });

  ngAfterViewInit(): void {
    this.firstField().nativeElement.focus();
  }

  protected invalid(name: 'name' | 'email' | 'message'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  async submit(): Promise<void> {
    if (this.state() === 'sending') return;
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.invalid || !value.name.trim() || value.message.trim().length < 10) return;

    this.state.set('sending');
    const result = await this.contactService.submit({
      name: value.name.trim(),
      email: value.email.trim(),
      subject: value.subject.trim(),
      message: value.message.trim(),
      lang: this.transloco.getActiveLang() === 'en' ? 'en' : 'es',
      website: value.website,
    });
    if (result === 'received') this.form.reset();
    this.state.set(result);
  }

  close(): void {
    this.closed.emit();
    this.returnFocusTo()?.focus();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap: Tab and Shift+Tab cycle inside the dialog.
    const focusable = Array.from(
      this.dialog().nativeElement.querySelectorAll<HTMLElement>('button, input:not([tabindex="-1"]), textarea, a[href]'),
    ).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
