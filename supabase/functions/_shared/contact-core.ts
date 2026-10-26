// Pure logic for the contact inbox Edge Functions.
// No imports and only standard web APIs (TextEncoder, crypto.subtle, btoa, atob), so the same
// file runs in Deno and is unit-tested by Karma from src/testing/contact-core.spec.ts.

export type Lang = 'es' | 'en';
export type ThreadStatus = 'new' | 'read' | 'replied' | 'archived';
export type Direction = 'in' | 'out';

export interface SubmissionInput {
  name: unknown;
  email: unknown;
  subject: unknown;
  message: unknown;
  lang: unknown;
  website: unknown;
}

export interface Submission {
  name: string;
  email: string;
  subject: string;
  message: string;
  lang: Lang;
}

export type SubmissionResult =
  | { ok: true; value: Submission }
  | { ok: false; field: keyof Submission }
  | { ok: 'honeypot' };

export interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

const CONTROL_CHARS = /[\x00-\x1F\x7F]/;
const CONTROL_CHARS_EXCEPT_NEWLINES = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/;
const EMAIL_PATTERN = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;
const SIGNATURE = '\n\n--\nCamilo Ayala';

export function validateSubmission(input: SubmissionInput): SubmissionResult {
  if (typeof input.website === 'string' && input.website.trim() !== '') return { ok: 'honeypot' };

  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const name = text(input.name);
  const email = text(input.email);
  const subject = text(input.subject);
  const message = text(input.message).replace(/\r\n/g, '\n');

  if (name.length < 1 || name.length > 80 || CONTROL_CHARS.test(name)) return { ok: false, field: 'name' };
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, field: 'email' };
  if (subject.length > 120 || CONTROL_CHARS.test(subject)) return { ok: false, field: 'subject' };
  if (message.length < 10 || message.length > 5000 || CONTROL_CHARS_EXCEPT_NEWLINES.test(message)) {
    return { ok: false, field: 'message' };
  }
  if (input.lang !== 'es' && input.lang !== 'en') return { ok: false, field: 'lang' };

  return { ok: true, value: { name, email, subject, message, lang: input.lang } };
}

/** Header values never carry line breaks or control characters (prevents header injection). */
export function sanitizeHeader(value: string): string {
  return value.replace(/[\x00-\x1F\x7F]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64UrlToUtf8(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodeHeaderWord(value: string): string {
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${utf8ToBase64(value)}?=`;
}

/** RFC 2822 plain-text message, base64url-encoded as the Gmail API `raw` field expects. */
export function buildRawEmail(m: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
  replyTo?: string | null;
}): string {
  const headers = [
    `From: ${sanitizeHeader(m.from)}`,
    `To: ${sanitizeHeader(m.to)}`,
    ...(m.replyTo ? [`Reply-To: ${sanitizeHeader(m.replyTo)}`] : []),
    `Subject: ${encodeHeaderWord(sanitizeHeader(m.subject))}`,
    ...(m.inReplyTo ? [`In-Reply-To: ${sanitizeHeader(m.inReplyTo)}`] : []),
    ...(m.references ? [`References: ${sanitizeHeader(m.references)}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const body = (utf8ToBase64(m.body.replace(/\r?\n/g, '\r\n')).match(/.{1,76}/g) ?? ['']).join('\r\n');
  const mime = `${headers.join('\r\n')}\r\n\r\n${body}`;
  return utf8ToBase64(mime).replace(/\+/g, '-').replace(/\//g, '_');
}

function quote(message: string): string {
  return message
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function ackEmail(lang: Lang, name: string, message: string): { subject: string; body: string } {
  if (lang === 'en') {
    return {
      subject: 'I got your message · Camilo Ayala',
      body:
        `Hi ${name},\n\nThanks for reaching out. I received your message and will reply within 24 hours to this same email.` +
        `\n\nYour message:\n${quote(message)}${SIGNATURE}`,
    };
  }
  return {
    subject: 'Recibí tu mensaje · Camilo Ayala',
    body:
      `Hola ${name},\n\nGracias por escribirme. Recibí tu mensaje y te responderé en menos de 24 horas a este mismo correo.` +
      `\n\nTu mensaje:\n${quote(message)}${SIGNATURE}`,
  };
}

export function ownerNoticeEmail(s: Submission, adminUrl: string, threadId: string): { subject: string; body: string } {
  const base = adminUrl.replace(/\/+$/, '');
  return {
    subject: `Nuevo mensaje de contacto: ${s.name}${s.subject ? ` · ${s.subject}` : ''}`,
    body: [
      `Nombre: ${s.name}`,
      `Email: ${s.email}`,
      `Idioma: ${s.lang.toUpperCase()}`,
      `Asunto: ${s.subject || '(sin asunto)'}`,
      '',
      s.message,
      '',
      `Responder en el panel: ${base}/admin/inbox/${threadId}`,
    ].join('\n'),
  };
}

/** Panel replies always end with the same signature. */
export function withSignature(body: string): string {
  return `${body.trim()}${SIGNATURE}`;
}

const ATTRIBUTION = /^(El|On)\s.+(escribió|wrote):\s*$/;

/** Keeps only the new part of a reply; returns the whole text when nothing would remain. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let cut = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const joined = i + 1 < lines.length ? `${line} ${lines[i + 1].trim()}` : line;
    if (ATTRIBUTION.test(line) || (/^(El|On)\s/.test(line) && !line.endsWith(':') && ATTRIBUTION.test(joined))) {
      cut = i;
      break;
    }
    if (line.startsWith('>') && lines.slice(i).every((rest) => rest.trim() === '' || rest.trim().startsWith('>'))) {
      cut = i;
      break;
    }
  }

  const kept = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();
  return kept || text.trim();
}

function findPart(part: GmailPart, mimeType: string): GmailPart | null {
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n');
}

export function extractMessage(payload: GmailPart): { from: string; messageIdHeader: string; subject: string; body: string } {
  const header = (name: string) =>
    payload.headers?.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  const plain = findPart(payload, 'text/plain');
  const html = plain ? null : findPart(payload, 'text/html');
  const raw = plain ? base64UrlToUtf8(plain.body!.data!) : html ? htmlToText(base64UrlToUtf8(html.body!.data!)) : '';

  return {
    from: header('From'),
    messageIdHeader: header('Message-ID'),
    subject: header('Subject'),
    body: raw.replace(/\r\n/g, '\n').trim(),
  };
}

export function isFromAddress(fromHeader: string, address: string): boolean {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase() === address.trim().toLowerCase();
}

/** Any incoming message reopens the conversation as new; only outgoing ones mark it replied. */
export function nextStatus(current: ThreadStatus, incoming: Direction[]): ThreadStatus {
  if (incoming.includes('in')) return 'new';
  if (incoming.includes('out')) return 'replied';
  return current;
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}${salt}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
