import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { InboxMessage, InboxService, InboxThread } from '../../../core/data/inbox.service';
import { ReplyFields, buildReplyEmail, emptyReplyFields, gmailComposeUrl } from '../../../core/data/reply-email';
import { SiteContentService } from '../../../core/data/site-content.service';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../shared/toast.service';

/**
 * "Preparar respuesta": campos según el tema del mensaje, vista previa del correo con diseño y botones
 * para copiarlo con formato (y abrir Gmail con destinatario y asunto). En Gmail se pega con Ctrl + V.
 * Lo que no se rellena no aparece en el correo.
 */
@Component({
  selector: 'app-reply-composer',
  standalone: true,
  templateUrl: './reply-composer.component.html',
  styleUrls: ['../shared/admin-form.css', './reply-composer.component.css'],
})
export class ReplyComposerComponent {
  readonly thread = input.required<InboxThread>();
  readonly messages = input.required<InboxMessage[]>();
  /** Se copió la respuesta o se abrió Gmail: la conversación pasa a respondida. */
  readonly replied = output<void>();

  private readonly inbox = inject(InboxService);
  private readonly siteContent = inject(SiteContentService);
  private readonly transloco = inject(TranslocoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);

  /** Por defecto, el idioma en el que escribió el visitante. */
  protected readonly lang = linkedSignal(() => this.thread().lang);
  protected readonly fields = signal<ReplyFields>(emptyReplyFields());
  protected readonly error = signal('');
  /** Sube cuando llega un archivo de idioma, para releer la frase del perfil. */
  private readonly i18nLoaded = signal(0);

  constructor() {
    this.siteContent.ensureLoaded();
    for (const lang of ['es', 'en']) this.transloco.load(lang).subscribe(() => this.i18nLoaded.update((n) => n + 1));
  }

  /** Texto público de la web: lo guardado en el panel o, si no, el del archivo de idioma. */
  private siteText(key: string, lang: string): string {
    this.i18nLoaded();
    const saved = this.siteContent.valueFor(key, lang);
    if (saved.trim()) return saved;
    const value = this.transloco.getTranslation(lang)?.[key];
    return typeof value === 'string' ? value : '';
  }

  /** La disponibilidad que muestra la web, como sugerencia del campo. */
  protected readonly siteAvailability = computed(() => this.siteText('availability_text', this.lang()));

  private readonly original = computed(() => this.messages().map((message) => message.body).join('\n\n'));

  protected readonly email = computed(() => {
    const thread = this.thread();
    const lang = this.lang();
    const fields = this.fields();
    return buildReplyEmail({
      topic: thread.topic,
      lang,
      name: thread.name,
      original: this.original(),
      receivedAt: this.messages()[0]?.createdAt ?? thread.createdAt,
      fields: { ...fields, availability: fields.availability.trim() || this.siteAvailability() },
      // Las mismas cifras y respaldos que muestran el hero y el modo reclutador.
      profile: {
        years: this.siteText('hero_m1_value', 'es') || '3',
        projects: this.siteText('hero_m2_value', 'es') || '11',
        stack: this.siteText('hero_m3_value', 'es') || '14',
        line: this.siteText('hero_lead', lang),
      },
      siteUrl: environment.siteUrl,
      contactEmail: this.siteText('contact_email', 'es') || this.siteText('ct_b', 'es'),
    });
  });

  /**
   * Vista previa en un iframe aislado (sandbox sin scripts). El HTML ya llega escapado desde
   * buildReplyEmail, y el sandbox impide que nada se ejecute aunque algo se colara.
   */
  protected readonly preview = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;background:#EEF0F3;">${this.email().html}</body></html>`,
    ),
  );

  /** La respuesta rápida en texto de siempre, por si no hace falta el diseño. */
  protected readonly quickUrl = computed(() => this.inbox.replyGmailUrl(this.thread(), this.original()));

  protected set(key: keyof ReplyFields, value: string): void {
    this.fields.update((fields) => ({ ...fields, [key]: value }));
  }

  /** Copia el correo con formato (HTML y texto) y, si se pide, abre la redacción de Gmail. */
  protected async copy(openGmail: boolean): Promise<void> {
    const { html, text, subject } = this.email();
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('sin soporte');
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      this.error.set('No se pudo copiar con formato. Usa Chrome o Edge actualizados, o la respuesta rápida en texto.');
      return;
    }
    this.error.set('');
    // Se abre después de copiar: si Gmail se abre antes, la página pierde el foco y el navegador no deja copiar.
    if (openGmail) window.open(gmailComposeUrl(this.thread().email, subject), '_blank', 'noopener');
    this.toast.show('Respuesta copiada. En Gmail, pégala con Ctrl + V.');
    this.replied.emit();
  }
}
