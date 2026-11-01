import { ReplyInput, buildReplyEmail, emptyReplyFields, formatStamp, gmailComposeUrl } from './reply-email';

const base = (over: Partial<ReplyInput> = {}): ReplyInput => ({
  topic: 'project',
  lang: 'es',
  name: 'Laura',
  original: 'Hola Camilo,\nnecesito una web.',
  receivedAt: '2026-10-29T05:30:00Z',
  fields: emptyReplyFields(),
  profile: { years: '3', projects: '11', stack: '14', line: 'Productos web rápidos.' },
  siteUrl: 'https://ejemplo.dev/',
  contactEmail: 'yo@ejemplo.dev',
  ...over,
});

describe('buildReplyEmail', () => {
  it('proyecto: asunto, saludo, logo con URL absoluta, firma y mensaje citado', () => {
    const email = buildReplyEmail(base({ fields: { ...emptyReplyFields(), summary: 'Una web', timeline: '4 semanas' } }));
    expect(email.subject).toBe('Re: Proyecto · Camilo Ayala');
    expect(email.html).toContain('Hola Laura,');
    expect(email.html).toContain('src="https://ejemplo.dev/apple-touch-icon.png"');
    expect(email.html).toContain('LO QUE ENTENDÍ');
    expect(email.html).toContain('PLAZO ESTIMADO');
    expect(email.html).toContain('4 semanas');
    expect(email.html).toContain('yo@ejemplo.dev');
    expect(email.html).toContain('Hola Camilo,<br>necesito una web.');
    expect(email.text).toContain('> necesito una web.');
  });

  it('lo vacío no aparece: sin propuesta, otra introducción y sin tabla', () => {
    const email = buildReplyEmail(base());
    expect(email.html).not.toContain('PROPUESTA INICIAL');
    expect(email.html).not.toContain('LO QUE ENTENDÍ');
    expect(email.html).toContain('Me encantaría ayudarte');
    expect(email.html).toContain('SIGUIENTES PASOS');
    // Las secciones se numeran según las que hay.
    expect(email.html).toContain('>01</b>&nbsp;&nbsp;SIGUIENTES PASOS');
  });

  it('escapa lo que escribe el visitante y lo del panel', () => {
    const email = buildReplyEmail(base({ name: '<b>Ana</b>', original: '<script>alert(1)</script>', fields: { ...emptyReplyFields(), scope: 'a & b' } }));
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(email.html).toContain('a &amp; b');
  });

  it('oferta de trabajo en inglés: perfil con las cifras de la web, preguntas y enlace al modo reclutador', () => {
    const email = buildReplyEmail(base({ topic: 'job', lang: 'en', fields: { ...emptyReplyFields(), availability: 'From December' } }));
    expect(email.subject).toBe('Re: Job offer · Camilo Ayala');
    expect(email.html).toContain('Hi Laura,');
    expect(email.html).toContain('3+');
    expect(email.html).toContain('11+');
    expect(email.html).toContain('The expected salary range.');
    expect(email.html).toContain('From December');
    expect(email.html).toContain('href="https://ejemplo.dev/reclutador"');
  });

  it('otra cosa: solo la respuesta libre, sin propuesta ni perfil', () => {
    const email = buildReplyEmail(base({ topic: 'other', fields: { ...emptyReplyFields(), message: 'Claro que sí.' } }));
    expect(email.subject).toBe('Re: Tu mensaje · Camilo Ayala');
    expect(email.html).toContain('Claro que sí.');
    expect(email.html).not.toContain('SIGUIENTES PASOS');
    expect(email.html).not.toContain('MI PERFIL');
  });
});

describe('utilidades del correo', () => {
  it('gmailComposeUrl: destinatario y asunto, cuerpo solo si se da, sin "+" por espacios', () => {
    const url = gmailComposeUrl('ana@mail.com', 'Re: Hola mundo');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('https://mail.google.com/mail/?')).toBeTrue();
    expect(params.get('to')).toBe('ana@mail.com');
    expect(params.get('su')).toBe('Re: Hola mundo');
    expect(params.has('body')).toBeFalse();
    expect(url).not.toContain('+');
  });

  it('formatStamp: dd.mm.aaaa · hh:mm, y vacío si la fecha no es válida', () => {
    expect(formatStamp('2026-10-29T05:30:00Z')).toMatch(/^\d\d\.\d\d\.2026 · \d\d:\d\d$/);
    expect(formatStamp('no es fecha')).toBe('');
  });
});
