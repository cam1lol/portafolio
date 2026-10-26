import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ContactModalComponent } from './contact-modal.component';
import { ContactService, ContactSubmitResult } from '../../core/data/contact.service';

const KEYS = [
  'ct_m_title', 'ct_m_name', 'ct_m_email', 'ct_m_subject', 'ct_m_message', 'ct_m_send', 'ct_m_sending',
  'ct_m_sent', 'ct_m_limit', 'ct_m_error', 'ct_m_err_name', 'ct_m_err_email', 'ct_m_err_message', 'ct_m_close',
];
/** Each key translates to itself, so assertions can look for the key in the rendered text. */
const identity = Object.fromEntries(KEYS.map((key) => [key, key]));

describe('ContactModalComponent', () => {
  let fixture: ComponentFixture<ContactModalComponent>;
  let submit: jasmine.Spy<(input: unknown) => Promise<ContactSubmitResult>>;
  let trigger: HTMLButtonElement;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const field = (id: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;
  const type = (id: string, value: string) => {
    const element = field(id);
    element.value = value;
    element.dispatchEvent(new Event('input'));
  };
  const send = async () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
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

  it('no envía si el formulario es inválido', async () => {
    type('contact-name', 'Ana');
    type('contact-email', 'ana@mail.com');
    type('contact-message', 'corto');
    await send();
    expect(submit).not.toHaveBeenCalled();
    expect(text()).toContain('ct_m_err_message');
  });

  it('muestra el estado enviado y limpia el formulario', async () => {
    submit.and.resolveTo('received');
    fillValid();
    await send();
    expect(submit).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Ana', email: 'ana@mail.com', lang: 'es', website: '' }));
    expect(text()).toContain('ct_m_sent');
    expect(field('contact-name').value).toBe('');
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
