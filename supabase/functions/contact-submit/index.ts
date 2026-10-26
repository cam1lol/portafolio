// Public contact form endpoint. Stores the conversation first, then emails through Gmail.
// Responses: 200 {status:'received'} | 400 {status:'invalid', field} | 429 {status:'rate_limited'}.
// Deploy with --no-verify-jwt: publishable keys are not JWTs; anti-spam happens here.
import { ackEmail, buildRawEmail, hashIp, ownerNoticeEmail, validateSubmission } from '../_shared/contact-core.ts';
import { getAccessToken, getMessageIdHeader, sendMessage } from '../_shared/gmail.ts';
import { json, preflight, recordSyncError, serviceClient } from '../_shared/http.ts';

const PER_IP_PER_HOUR = 3;
const TOTAL_PER_HOUR = 30;

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, 405, { status: 'method_not_allowed' });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json(req, 400, { status: 'invalid', field: 'message' });
  }

  const result = validateSubmission({
    name: input?.name,
    email: input?.email,
    subject: input?.subject,
    message: input?.message,
    lang: input?.lang,
    website: input?.website,
  });
  // Bots get the same answer as people, so the trap stays invisible.
  if (result.ok === 'honeypot') return json(req, 200, { status: 'received' });
  if (result.ok === false) return json(req, 400, { status: 'invalid', field: result.field });
  const submission = result.value;

  const client = serviceClient();
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await hashIp(ip, Deno.env.get('CONTACT_IP_SALT') ?? '');
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [perIp, total] = await Promise.all([
    client.from('contact_threads').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo),
    client.from('contact_threads').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo),
  ]);
  if ((perIp.count ?? 0) >= PER_IP_PER_HOUR || (total.count ?? 0) >= TOTAL_PER_HOUR) {
    return json(req, 429, { status: 'rate_limited' });
  }

  // 1. Persist before any email, so a Gmail failure never loses the message.
  const { data: thread, error: threadError } = await client
    .from('contact_threads')
    .insert({
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      lang: submission.lang,
      ip_hash: ipHash,
    })
    .select('id')
    .single();
  if (threadError || !thread) {
    console.error('contact-submit: thread insert failed', threadError);
    return json(req, 500, { status: 'error' });
  }

  const { data: formMessage, error: messageError } = await client
    .from('contact_messages')
    .insert({ thread_id: thread.id, direction: 'in', body: submission.message, source: 'form' })
    .select('id')
    .single();
  if (messageError || !formMessage) {
    console.error('contact-submit: message insert failed', messageError);
    return json(req, 500, { status: 'error' });
  }

  // 2. Email: acknowledgement to the visitor (opens the Gmail thread) and a notice to Camilo.
  try {
    const gmailAddress = Deno.env.get('GMAIL_ADDRESS')!;
    const token = await getAccessToken();

    const ack = ackEmail(submission.lang, submission.name, submission.message);
    const sent = await sendMessage(
      token,
      buildRawEmail({ from: `Camilo Ayala <${gmailAddress}>`, to: submission.email, subject: ack.subject, body: ack.body, replyTo: gmailAddress }),
    );
    const headerId = await getMessageIdHeader(token, sent.id);
    await client
      .from('contact_threads')
      .update({ gmail_thread_id: sent.threadId, last_message_header_id: headerId })
      .eq('id', thread.id);
    // The acknowledgement quotes the visitor's message: it is that message's Gmail copy,
    // so the sync recognises it as already imported instead of counting it as a reply.
    await client.from('contact_messages').update({ gmail_message_id: sent.id }).eq('id', formMessage.id);

    const notice = ownerNoticeEmail(submission, Deno.env.get('ADMIN_URL') ?? '', thread.id);
    await sendMessage(
      token,
      buildRawEmail({ from: `Portafolio <${gmailAddress}>`, to: gmailAddress, subject: notice.subject, body: notice.body, replyTo: submission.email }),
    );
  } catch (error) {
    console.error('contact-submit: gmail failed', error);
    await recordSyncError(client, error instanceof Error ? error.message : String(error), thread.id);
  }

  return json(req, 200, { status: 'received' });
});
