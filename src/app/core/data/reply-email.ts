import { ContactTopic } from './contact.service';

/**
 * Correo de respuesta con diseño (logo, propuesta y firma) para pegar en Gmail. Es HTML de correo:
 * tablas, estilos en línea, tipografías del sistema y la imagen del logo por URL pública, porque los
 * clientes de correo no admiten variables CSS, grid, fuentes web ni SVG. Todo lo que viene del
 * visitante o del panel se escapa. Junto al HTML va una versión en texto para el portapapeles.
 */

/** Lo que Camilo escribe en el panel antes de copiar. Lo vacío no aparece en el correo. */
export interface ReplyFields {
  /** Proyecto: lo que entendí de su mensaje. */
  summary: string;
  scope: string;
  deliverables: string;
  timeline: string;
  investment: string;
  /** Oferta de trabajo. */
  availability: string;
  /** Otra cosa: la respuesta libre. */
  message: string;
}

/** Cifras y frase de la propia web, para el perfil de la respuesta a una oferta de trabajo. */
export interface ReplyProfile {
  years: string;
  projects: string;
  stack: string;
  line: string;
}

export interface ReplyInput {
  topic: ContactTopic;
  lang: 'es' | 'en';
  /** Nombre del visitante. */
  name: string;
  /** Su mensaje, citado al final. */
  original: string;
  /** Fecha ISO de su mensaje. */
  receivedAt: string;
  fields: ReplyFields;
  profile: ReplyProfile;
  siteUrl: string;
  contactEmail: string;
}

export interface ReplyEmail {
  subject: string;
  html: string;
  text: string;
}

export const emptyReplyFields = (): ReplyFields => ({
  summary: '',
  scope: '',
  deliverables: '',
  timeline: '',
  investment: '',
  availability: '',
  message: '',
});

const LINKS = { github: 'https://github.com/cam1lol', linkedin: 'https://www.linkedin.com/in/camilo1' };

const C = {
  ink: '#0A0B0D',
  ember: '#F2541B',
  // Ember oscurecido para texto sobre blanco (el ember puro no llega a 4.5:1).
  emberText: '#C2410C',
  bone: '#E9EAED',
  steel: '#8A93A6',
  text: '#33373F',
  muted: '#5B6170',
  line: '#E3E5E9',
  panel: '#F4F5F7',
};
const SANS = 'Arial, Helvetica, sans-serif';
const HEAVY = "'Arial Black', Arial, Helvetica, sans-serif";
const MONO = "'Courier New', Courier, monospace";

const COPY = {
  es: {
    hello: 'Hola',
    replyHint: 'o responde directamente a este correo.',
    yourMessage: 'TU MENSAJE',
    tagline: 'FULL-STACK · 3D · BOGOTÁ',
    role: 'Desarrollador full-stack y diseñador 3D',
    city: 'Bogotá, Colombia · UTC-5',
    footer: 'CAMILO AYALA · PORTAFOLIO · BOGOTÁ, CO',
    links: { portfolio: 'PORTAFOLIO', github: 'GITHUB', linkedin: 'LINKEDIN' },
    topics: {
      project: {
        subject: 'Proyecto',
        label: 'RE: PROYECTO',
        intro: 'Gracias por escribirme y por contarme tu idea. Te dejo una primera propuesta para que veas cómo lo plantearía; la ajustamos juntos antes de empezar.',
        introPlain: 'Gracias por escribirme y por contarme tu idea. Me encantaría ayudarte; te cuento cómo podemos seguir.',
        cta: 'VER MI PORTAFOLIO',
      },
      job: {
        subject: 'Oferta de trabajo',
        label: 'RE: OFERTA',
        intro: 'Gracias por pensar en mí para esta posición. Me interesa conocer más; te dejo un resumen rápido de mi perfil y algunas preguntas para avanzar.',
        introPlain: '',
        cta: 'VER MI PERFIL Y CV',
      },
      other: { subject: 'Tu mensaje', label: 'RE: TU MENSAJE', intro: 'Gracias por escribirme.', introPlain: '', cta: 'VER MI PORTAFOLIO' },
    },
    sections: {
      understood: 'LO QUE ENTENDÍ',
      proposal: 'PROPUESTA INICIAL',
      next: 'SIGUIENTES PASOS',
      profile: 'MI PERFIL EN 30 SEGUNDOS',
      ask: 'PARA AVANZAR, ME AYUDARÍA SABER',
      availability: 'DISPONIBILIDAD',
    },
    rows: { scope: 'ALCANCE', deliverables: 'ENTREGABLES', timeline: 'PLAZO ESTIMADO', investment: 'INVERSIÓN' },
    steps: [
      'Me confirmas si la propuesta encaja o qué cambiarías.',
      'Hacemos una llamada corta para cerrar los detalles.',
      'Te envío la propuesta formal y empezamos.',
    ],
    stats: { years: 'AÑOS DE EXPERIENCIA', projects: 'PROYECTOS', stack: 'TECNOLOGÍAS' },
    questions: [
      'El rol y las responsabilidades principales.',
      'Cómo es el proceso de selección y sus etapas.',
      'La modalidad: remoto, híbrido o presencial.',
      'El rango salarial previsto.',
    ],
  },
  en: {
    hello: 'Hi',
    replyHint: 'or simply reply to this email.',
    yourMessage: 'YOUR MESSAGE',
    tagline: 'FULL-STACK · 3D · BOGOTÁ',
    role: 'Full-stack developer and 3D designer',
    city: 'Bogotá, Colombia · UTC-5',
    footer: 'CAMILO AYALA · PORTFOLIO · BOGOTÁ, CO',
    links: { portfolio: 'PORTFOLIO', github: 'GITHUB', linkedin: 'LINKEDIN' },
    topics: {
      project: {
        subject: 'Project',
        label: 'RE: PROJECT',
        intro: 'Thanks for reaching out and telling me about your idea. Here is a first proposal so you can see how I would approach it; we will adjust it together before starting.',
        introPlain: 'Thanks for reaching out and telling me about your idea. I would love to help; here is how we can move forward.',
        cta: 'SEE MY PORTFOLIO',
      },
      job: {
        subject: 'Job offer',
        label: 'RE: JOB OFFER',
        intro: 'Thanks for thinking of me for this position. I would like to learn more; here is a quick summary of my profile and a few questions to move forward.',
        introPlain: '',
        cta: 'SEE MY PROFILE AND CV',
      },
      other: { subject: 'Your message', label: 'RE: YOUR MESSAGE', intro: 'Thanks for reaching out.', introPlain: '', cta: 'SEE MY PORTFOLIO' },
    },
    sections: {
      understood: 'WHAT I UNDERSTOOD',
      proposal: 'INITIAL PROPOSAL',
      next: 'NEXT STEPS',
      profile: 'MY PROFILE IN 30 SECONDS',
      ask: 'TO MOVE FORWARD, IT WOULD HELP TO KNOW',
      availability: 'AVAILABILITY',
    },
    rows: { scope: 'SCOPE', deliverables: 'DELIVERABLES', timeline: 'ESTIMATED TIMELINE', investment: 'INVESTMENT' },
    steps: [
      'Let me know if the proposal fits or what you would change.',
      'We have a short call to settle the details.',
      'I send you the formal proposal and we get started.',
    ],
    stats: { years: 'YEARS OF EXPERIENCE', projects: 'PROJECTS', stack: 'TECHNOLOGIES' },
    questions: [
      'The role and its main responsibilities.',
      'How the selection process works and its stages.',
      'The work arrangement: remote, hybrid or on-site.',
      'The expected salary range.',
    ],
  },
};

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** Texto de varias líneas como HTML: escapado y con <br> en cada salto. */
const lines = (value: string) => esc(value.trim()).replace(/\r?\n/g, '<br>');
const has = (value: string) => value.trim() !== '';

/** "29.10.2026 · 00:30", en la hora local de quien prepara la respuesta. */
export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Redacción de Gmail en la web con destinatario, asunto y, si se da, cuerpo en texto. */
export function gmailComposeUrl(to: string, subject: string, body?: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject });
  if (body !== undefined) params.set('body', body);
  // URLSearchParams codifica los espacios como "+", y Gmail los mostraría tal cual.
  return `https://mail.google.com/mail/?${params.toString().replace(/\+/g, '%20')}`;
}

export function buildReplyEmail(input: ReplyInput): ReplyEmail {
  const t = COPY[input.lang];
  const topic = t.topics[input.topic];
  const f = input.fields;
  const site = input.siteUrl.replace(/\/$/, '');
  const logo = `${site}/apple-touch-icon.png`;
  const ctaUrl = input.topic === 'job' ? `${site}/reclutador` : site;
  const subject = `Re: ${topic.subject} · Camilo Ayala`;

  const html: string[] = [];
  const text: string[] = [];
  let section = 0;

  // ---- Piezas reutilizables
  const label = (title: string) => {
    section += 1;
    text.push('', title);
    return `<p style="margin:26px 0 10px;font-family:${MONO};font-size:11px;letter-spacing:.16em;color:${C.muted};"><b style="color:${C.emberText};">${String(section).padStart(2, '0')}</b>&nbsp;&nbsp;${esc(title)}</p>`;
  };
  const panel = (value: string) =>
    `<p style="margin:0;padding:14px 16px;background:${C.panel};font-family:${SANS};font-size:14px;line-height:1.55;color:${C.text};">${lines(value)}</p>`;
  const bullet = (mark: string, value: string) =>
    `<tr><td width="24" style="padding:0 0 8px;vertical-align:top;font-family:${MONO};font-size:14px;font-weight:bold;color:${C.emberText};">${esc(mark)}</td><td style="padding:0 0 8px;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.text};">${esc(value)}</td></tr>`;

  // ---- Contenido según el tema
  const rows = (['scope', 'deliverables', 'timeline', 'investment'] as const).filter((key) => has(f[key]));
  const hasProposal = has(f.summary) || rows.length > 0;
  const intro = input.topic === 'project' && !hasProposal ? topic.introPlain : topic.intro;
  const greeting = `${t.hello} ${input.name.trim()},`;
  text.push(greeting, '', intro);

  const body: string[] = [];
  if (input.topic === 'project') {
    if (has(f.summary)) {
      body.push(label(t.sections.understood), panel(f.summary));
      text.push(f.summary.trim());
    }
    if (rows.length) {
      body.push(label(t.sections.proposal));
      body.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.line};">` +
          rows
            .map(
              (key, i) =>
                `<tr><td width="30%" style="padding:12px 16px;vertical-align:top;${i ? `border-top:1px solid ${C.line};` : ''}font-family:${MONO};font-size:11px;letter-spacing:.1em;color:${C.muted};">${esc(t.rows[key])}</td><td style="padding:12px 16px 12px 0;vertical-align:top;${i ? `border-top:1px solid ${C.line};` : ''}font-family:${SANS};font-size:14px;line-height:1.5;color:${C.text};">${lines(f[key])}</td></tr>`,
            )
            .join('') +
          '</table>',
      );
      for (const key of rows) text.push(`${t.rows[key]}: ${f[key].trim()}`);
    }
    body.push(label(t.sections.next));
    body.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${t.steps.map((step, i) => bullet(`${i + 1}.`, step)).join('')}</table>`);
    t.steps.forEach((step, i) => text.push(`${i + 1}. ${step}`));
  } else if (input.topic === 'job') {
    const stats: [string, string][] = [
      [`${input.profile.years}+`, t.stats.years],
      [`${input.profile.projects}+`, t.stats.projects],
      [input.profile.stack, t.stats.stack],
    ];
    body.push(label(t.sections.profile));
    body.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.line};"><tr>` +
        stats
          .map(
            ([value, name], i) =>
              `<td width="33%" style="padding:16px;vertical-align:top;${i ? `border-left:1px solid ${C.line};` : ''}"><div style="font-family:${HEAVY};font-size:26px;color:${C.emberText};">${esc(value)}</div><div style="padding-top:4px;font-family:${MONO};font-size:10px;letter-spacing:.12em;color:${C.muted};">${esc(name)}</div></td>`,
          )
          .join('') +
        '</tr></table>',
    );
    stats.forEach(([value, name]) => text.push(`${value} ${name}`));
    if (has(input.profile.line)) {
      body.push(`<p style="margin:12px 0 0;font-family:${SANS};font-size:14px;line-height:1.55;color:${C.text};">${lines(input.profile.line)}</p>`);
      text.push(input.profile.line.trim());
    }
    body.push(label(t.sections.ask));
    body.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${t.questions.map((q) => bullet('—', q)).join('')}</table>`);
    t.questions.forEach((q) => text.push(`- ${q}`));
    if (has(f.availability)) {
      body.push(label(t.sections.availability), panel(f.availability));
      text.push(f.availability.trim());
    }
  } else if (has(f.message)) {
    body.push(`<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${lines(f.message)}</p>`);
    text.push('', f.message.trim());
  }

  text.push('', `${topic.cta}: ${ctaUrl}`, `(${t.replyHint})`);

  // ---- Correo completo
  html.push(
    `<div style="max-width:600px;">`,
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;background:#FFFFFF;border:1px solid ${C.line};">`,
    // Cabecera oscura con el logo y una línea ember.
    `<tr><td style="background:${C.ink};border-bottom:3px solid ${C.ember};padding:0;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>`,
    `<td width="40" style="padding:20px 0 20px 28px;vertical-align:middle;"><img src="${esc(logo)}" width="40" height="40" alt="CA" style="display:block;border:0;width:40px;height:40px;"></td>`,
    // Solo marca y nombre: en un móvil no cabe nada más en la misma línea sin partir el nombre.
    `<td style="padding:20px 28px 20px 14px;vertical-align:middle;"><div style="white-space:nowrap;font-family:${HEAVY};font-size:15px;letter-spacing:.06em;color:${C.bone};">CAMILO AYALA</div><div style="padding-top:3px;white-space:nowrap;font-family:${MONO};font-size:10px;letter-spacing:.18em;color:${C.steel};">${esc(t.tagline)}</div></td>`,
    `</tr></table></td></tr>`,
    // Cuerpo.
    `<tr><td style="padding:32px 32px 8px;">`,
    `<p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:.16em;color:${C.emberText};">// ${esc(topic.label)}</p>`,
    `<h1 style="margin:16px 0 0;font-family:${HEAVY};font-size:26px;line-height:1.15;font-weight:900;color:${C.ink};">${esc(greeting)}</h1>`,
    `<p style="margin:16px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${esc(intro)}</p>`,
    ...body,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:28px;"><tr><td style="background:${C.ink};border-bottom:3px solid ${C.ember};"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 22px;font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:.14em;color:#FFFFFF;text-decoration:none;">${esc(topic.cta)}</a></td></tr></table>`,
    `<p style="margin:12px 0 0;font-family:${SANS};font-size:13px;color:${C.muted};">${esc(t.replyHint)}</p>`,
    `</td></tr>`,
    // Firma.
    `<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:24px;border-top:1px solid ${C.line};"><tr>`,
    `<td width="48" style="padding:24px 0;vertical-align:top;"><img src="${esc(logo)}" width="48" height="48" alt="CA" style="display:block;border:0;width:48px;height:48px;"></td>`,
    `<td style="padding:24px 0 24px 16px;vertical-align:top;">`,
    `<div style="font-family:${HEAVY};font-size:15px;color:${C.ink};">Camilo Ayala</div>`,
    `<div style="padding-top:4px;font-family:${SANS};font-size:13px;color:${C.text};">${esc(t.role)}</div>`,
    `<div style="padding-top:4px;font-family:${SANS};font-size:12px;color:${C.muted};">${esc(t.city)}${has(input.contactEmail) ? ` · ${esc(input.contactEmail)}` : ''}</div>`,
    `<div style="padding-top:8px;font-family:${MONO};font-size:11px;letter-spacing:.12em;"><a href="${esc(site)}" style="color:${C.emberText};text-decoration:none;">${t.links.portfolio}</a> <span style="color:#B8BDC6;">·</span> <a href="${LINKS.github}" style="color:${C.emberText};text-decoration:none;">${t.links.github}</a> <span style="color:#B8BDC6;">·</span> <a href="${LINKS.linkedin}" style="color:${C.emberText};text-decoration:none;">${t.links.linkedin}</a></div>`,
    `</td></tr></table></td></tr>`,
    // Su mensaje, citado.
    `<tr><td style="padding:0 32px 32px;"><div style="background:${C.panel};padding:16px;">`,
    `<div style="font-family:${MONO};font-size:10px;letter-spacing:.14em;color:${C.muted};">${esc(t.yourMessage)}${formatStamp(input.receivedAt) ? ` · ${formatStamp(input.receivedAt)}` : ''}</div>`,
    `<div style="padding-top:8px;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted};">${lines(input.original)}</div>`,
    `</div></td></tr>`,
    `</table>`,
    `<p style="margin:14px 0 0;text-align:center;font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${C.muted};">${esc(t.footer)}</p>`,
    `</div>`,
  );

  text.push(
    '',
    '--',
    'Camilo Ayala',
    t.role,
    `${t.city}${has(input.contactEmail) ? ` · ${input.contactEmail}` : ''}`,
    `${t.links.portfolio}: ${site} | GitHub: ${LINKS.github} | LinkedIn: ${LINKS.linkedin}`,
    '',
    `${t.yourMessage}${formatStamp(input.receivedAt) ? ` · ${formatStamp(input.receivedAt)}` : ''}`,
    ...input.original.trim().split(/\r?\n/).map((line) => `> ${line}`),
  );

  return { subject, html: html.join(''), text: text.join('\n') };
}
