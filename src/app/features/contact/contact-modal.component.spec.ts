import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ContactModalComponent } from './contact-modal.component';
import { ContactService, ContactSubmitResult } from '../../core/data/contact.service';

const KEYS = [
  'ct_m_title', 'ct_m_lead', 'ct_m_name', 'ct_m_email', 'ct_m_email_hint', 'ct_m_topic', 'ct_m_topic_project',
  'ct_m_topic_job', 'ct_m_topic_other', 'ct_m_message', 'ct_m_ph_project', 'ct_m_ph_job', 'ct_m_ph_other',
  'ct_m_missing', 'ct_m_send', 'ct_m_sending', 'ct_m_privacy', 'ct_m_sent_title', 'ct_m_sent_body', 'ct_m_close',
  'ct_m_again', 'ct_m_error', 'ct_m_limit', 'ct_m_err_name', 'ct_m_err_email', 'ct_m_err_message',
];
/** Each key translates to itself, so assertions look for the key in the rendered text. */
const identity = Object.fromEntries(KEYS.map((key) => [key, key]));

describe('ContactModalComponent', () => {
  let fixture: ComponentFixture<ContactModalComponent>;
  let submit: jasmine.Spy<(input: unknown) => Promise<ContactSubmitResult>>;
  let trigger: HTMLButtonElement;

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const field = (id: string) => root().querySelector<HTMLInputElement>(`#${id}`)!;
  const type = (id: string, value: string) => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const send = async () => {
    root().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const fillValid = () => {
    type('contact-name', 'Ana');
    type('contact-email', 'ana@mail.com');
    type('contact-message', 'Hola, quiero cotizar un proyecto.');
  };

  beforeEach(async () => {
    submit = jasmine.createSpy('submit');
    trigger = document.createElement('button');
    document.body.appendChild(trigger);

    await TestBed.configureTestingModule({
      imports: [
        ContactModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { es: identity, en: identity },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [{ provide: ContactService, useValue: { submit } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactModalComponent);
    fixture.componentRef.setInput('returnFocusTo', trigger);
    fixture.detectChanges();
  });

  afterEach(() => trigger.remove());

  it('no envía si el mensaje es corto y lleva el foco al campo con error', async () => {
    type('contact-name', 'Ana');
    type('contact-email', 'ana@mail.com');
    type('contact-message', 'corto');
    await send();
    expect(submit).not.toHaveBeenCalled();
    expect(text()).toContain('ct_m_err_message');
    expect(document.activeElement).toBe(field('contact-message'));
  });

  it('el ejemplo del mensaje cambia según el tema y se envía el tema elegido', async () => {
    expect(field('contact-message').placeholder).toBe('ct_m_ph_other');
    // Order: project, job, other. [value] sets the property, not the attribute.
    root().querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    fixture.detectChanges();
    expect(field('contact-message').placeholder).toBe('ct_m_ph_job');

    submit.and.resolveTo('received');
    fillValid();
    await send();
    expect(submit).toHaveBeenCalledWith(jasmine.objectContaining({ topic: 'job', name: 'Ana', email: 'ana@mail.com', lang: 'es', website: '' }));
  });

  it('al enviar reemplaza el formulario por la confirmación', async () => {
    submit.and.resolveTo('received');
    fillValid();
    await send();
    expect(text()).toContain('ct_m_sent_title');
    expect(root().querySelector('form')).toBeNull();
  });

  it('si falla conserva lo escrito y ofrece el email directo', async () => {
    submit.and.resolveTo('error');
    fillValid();
    await send();
    expect(text()).toContain('ct_m_error');
    expect(field('contact-message').value).toBe('Hola, quiero cotizar un proyecto.');
    expect(root().querySelector('a[href^="mailto:"]')).not.toBeNull();
  });

  it('muestra el límite', async () => {
    submit.and.resolveTo('rate_limited');
    fillValid();
    await send();
    expect(text()).toContain('ct_m_limit');
  });

  it('Escape cierra el modal y devuelve el foco al botón que lo abrió', () => {
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBeTrue();
    expect(document.activeElement).toBe(trigger);
  });
});
