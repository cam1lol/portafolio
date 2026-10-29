import { AfterViewInit, Component, OnInit, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ContactService, ContactSubmitResult, ContactTopic } from '../../core/data/contact.service';
import { noControlCharsValidator } from '../../shared/validators/no-control-chars.validator';
import { suggestEmail } from '../../shared/validators/email-suggestion';

type ModalState = 'idle' | 'sending' | ContactSubmitResult;

const EMAIL_PATTERN = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
/** Orden para llevar el foco al primer campo con error. */
const FIELD_IDS = { name: 'contact-name', email: 'contact-email', message: 'contact-message' } as const;

/**
 * Diálogo de contacto. Solo existe mientras está abierto (el padre lo envuelve en @if), así toma el
 * foco al crearse y lo devuelve a `returnFocusTo` al cerrarse.
 */
@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.css',
})
export class ContactModalComponent implements OnInit, AfterViewInit {
  private readonly contactService = inject(ContactService);
  private readonly transloco = inject(TranslocoService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly returnFocusTo = input<HTMLElement | null>(null);
  /** Se muestra como alternativa de email directo si el envío falla. */
  readonly contactEmail = input('kmilo0230@gmail.com');
  /** Servicio elegido con "Cotizar esto": el tema pasa a proyecto y el mensaje empieza nombrándolo. */
  readonly service = input('');
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  protected readonly topics: ContactTopic[] = ['project', 'job', 'other'];
  protected readonly messageMax = MESSAGE_MAX;
  protected readonly state = signal<ModalState>('idle');
  protected readonly sentTo = signal('');

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80), noControlCharsValidator()] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(254), Validators.pattern(EMAIL_PATTERN)],
    }),
    topic: new FormControl<ContactTopic | ''>('', { nonNullable: true }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MESSAGE_MAX), noControlCharsValidator({ allowNewlines: true })],
    }),
    website: new FormControl('', { nonNullable: true }),
  });

  private readonly topicValue = toSignal(this.form.controls.topic.valueChanges, { initialValue: '' as ContactTopic | '' });
  private readonly messageValue = toSignal(this.form.controls.message.valueChanges, { initialValue: '' });
  private readonly emailValue = toSignal(this.form.controls.email.valueChanges, { initialValue: '' });

  /** "¿Quisiste decir ana@gmail.com?" para erratas en dominios comunes; null si no hay nada que sugerir. */
  protected readonly emailSuggestion = computed(() => suggestEmail(this.emailValue() ?? ''));

  protected readonly placeholderKey = computed(() => `ct_m_ph_${this.topicValue() || 'other'}`);
  protected readonly messageLength = computed(() => this.messageValue().trim().length);
  protected readonly missing = computed(() => Math.max(0, MESSAGE_MIN - this.messageLength()));

  ngOnInit(): void {
    const service = this.service().trim();
    if (!service) return;
    this.form.patchValue({ topic: 'project', message: `${this.transloco.translate('ct_m_service', { service })}\n\n` });
  }

  ngAfterViewInit(): void {
    this.focusField('contact-name');
  }

  protected invalid(name: 'name' | 'email' | 'message'): boolean {
    const control = this.form.controls[name];
    const tooShort = name === 'message' && this.messageLength() < MESSAGE_MIN;
    return (control.invalid || tooShort) && control.touched;
  }

  async submit(): Promise<void> {
    if (this.state() === 'sending') return;
    this.form.markAllAsTouched();

    const firstInvalid = (Object.keys(FIELD_IDS) as Array<keyof typeof FIELD_IDS>).find((name) => this.invalid(name));
    if (firstInvalid) {
      this.focusField(FIELD_IDS[firstInvalid]);
      return;
    }

    const value = this.form.getRawValue();
    this.state.set('sending');
    const result = await this.contactService.submit({
      name: value.name.trim(),
      email: value.email.trim(),
      topic: value.topic || 'other',
      message: value.message.trim(),
      lang: this.transloco.getActiveLang() === 'en' ? 'en' : 'es',
      website: value.website,
    });
    if (result === 'received') {
      this.sentTo.set(value.email.trim());
      this.form.reset();
    }
    this.state.set(result);
  }

  acceptSuggestion(): void {
    const suggestion = this.emailSuggestion();
    if (!suggestion) return;
    this.form.controls.email.setValue(suggestion);
    this.focusField('contact-email');
  }

  sendAnother(): void {
    this.state.set('idle');
    queueMicrotask(() => this.focusField('contact-name'));
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

    // Trampa de foco: Tab y Shift+Tab dan la vuelta dentro del diálogo.
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

  private focusField(id: string): void {
    (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)?.focus();
  }
}
