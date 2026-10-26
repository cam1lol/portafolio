import {
  buildRawEmail,
  extractMessage,
  hashIp,
  isFromAddress,
  nextStatus,
  sanitizeHeader,
  stripQuotedReply,
  validateSubmission,
} from '../../supabase/functions/_shared/contact-core';

describe('validateSubmission', () => {
  const base = { name: 'Ana', email: 'ana+web@Mail.com', subject: '', message: 'Hola, quiero cotizar.', lang: 'es', website: '' };

  it('acepta un envío válido y recorta espacios', () => {
    expect(validateSubmission({ ...base, name: '  Ana  ' })).toEqual({
      ok: true,
      value: { name: 'Ana', email: 'ana+web@Mail.com', subject: '', message: 'Hola, quiero cotizar.', lang: 'es' },
    });
  });
  it('detecta el honeypot', () => expect(validateSubmission({ ...base, website: 'x' })).toEqual({ ok: 'honeypot' }));
  it('rechaza mensaje de menos de 10 caracteres', () =>
    expect(validateSubmission({ ...base, message: 'corto' })).toEqual({ ok: false, field: 'message' }));
  it('rechaza email inválido', () => expect(validateSubmission({ ...base, email: 'ana@' })).toEqual({ ok: false, field: 'email' }));
  it('rechaza nombre de 81 caracteres', () =>
    expect(validateSubmission({ ...base, name: 'a'.repeat(81) })).toEqual({ ok: false, field: 'name' }));
  it('rechaza idioma desconocido', () => expect(validateSubmission({ ...base, lang: 'fr' })).toEqual({ ok: false, field: 'lang' }));
  it('permite saltos de línea en el mensaje pero no caracteres de control', () => {
    expect(validateSubmission({ ...base, message: 'Linea 1\nLinea 2 larga' }).ok).toBe(true);
    expect(validateSubmission({ ...base, message: 'Hola\u0007 mundo largo' })).toEqual({ ok: false, field: 'message' });
  });
});

describe('sanitizeHeader / buildRawEmail', () => {
  const decode = (raw: string) =>
    new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

  it('elimina CR/LF de cabeceras', () => expect(sanitizeHeader('Hola\r\nBcc: x@y.com')).toBe('Hola Bcc: x@y.com'));
  it('no permite inyectar cabeceras desde el asunto', () => {
    const mime = decode(buildRawEmail({ from: 'a@a.com', to: 'b@b.com', subject: 'Hola\r\nBcc: evil@x.com', body: 'x' }));
    expect(mime.split('\r\n\r\n')[0].match(/^Bcc:/m)).toBeNull();
  });
  it('codifica asuntos no ASCII y añade In-Reply-To/References', () => {
    const mime = decode(
      buildRawEmail({
        from: 'a@a.com',
        to: 'b@b.com',
        subject: 'Cotización',
        body: 'x',
        inReplyTo: '<m1@mail.gmail.com>',
        references: '<m1@mail.gmail.com>',
      }),
    );
    expect(mime).toContain('Subject: =?UTF-8?B?');
    expect(mime).toContain('In-Reply-To: <m1@mail.gmail.com>');
    expect(mime).toContain('References: <m1@mail.gmail.com>');
  });
});

describe('stripQuotedReply', () => {
  it('corta en la cita en español de Gmail', () =>
    expect(
      stripQuotedReply('Perfecto, gracias.\n\nEl jue, 23 oct 2026 a las 10:00, Camilo <kmilo0230@gmail.com> escribió:\n> hola'),
    ).toBe('Perfecto, gracias.'));
  it('corta en la cita en inglés', () =>
    expect(stripQuotedReply('Sounds good.\n\nOn Thu, Oct 23, 2026 at 10:00 AM Camilo <k@g.com> wrote:\n> hi')).toBe('Sounds good.'));
  it('quita líneas citadas con >', () => expect(stripQuotedReply('Nuevo texto\n> viejo\n> mas viejo')).toBe('Nuevo texto'));
  it('si todo es cita devuelve el texto completo', () => expect(stripQuotedReply('> solo cita')).toBe('> solo cita'));
});

describe('extractMessage', () => {
  const b64 = (s: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_');
  const headers = [
    { name: 'From', value: 'Ana <ana@mail.com>' },
    { name: 'Message-ID', value: '<x1@mail>' },
    { name: 'Subject', value: 'Re: Hola' },
  ];

  it('prefiere text/plain en multipart anidado', () => {
    const payload = {
      headers,
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64('Hola Camilo') } },
            { mimeType: 'text/html', body: { data: b64('<p>Hola Camilo</p>') } },
          ],
        },
      ],
    };
    expect(extractMessage(payload)).toEqual({ from: 'Ana <ana@mail.com>', messageIdHeader: '<x1@mail>', subject: 'Re: Hola', body: 'Hola Camilo' });
  });
  it('usa el HTML sin etiquetas si no hay text/plain', () => {
    const payload = { headers, mimeType: 'text/html', body: { data: b64('<div>Hola<br>mundo &amp; más</div>') } };
    expect(extractMessage(payload).body).toBe('Hola\nmundo & más');
  });
});

describe('isFromAddress / nextStatus / hashIp', () => {
  it('compara direcciones sin mayúsculas', () => expect(isFromAddress('Camilo <KMILO0230@gmail.com>', 'kmilo0230@gmail.com')).toBeTrue());
  it('un entrante pone new aunque esté archivada', () => expect(nextStatus('archived', ['out', 'in'])).toBe('new'));
  it('solo salientes pone replied', () => expect(nextStatus('read', ['out'])).toBe('replied'));
  it('sin mensajes conserva el estado', () => expect(nextStatus('read', [])).toBe('read'));
  it('hashIp es sha256 hex determinista', async () => {
    const h = await hashIp('1.2.3.4', 'sal');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('1.2.3.4', 'sal')).toBe(h);
    expect(await hashIp('1.2.3.4', 'otra')).not.toBe(h);
  });
});
