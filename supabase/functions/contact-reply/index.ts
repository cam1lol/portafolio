// Admin reply from the inbox. Sends through Gmail inside the conversation's thread, then stores it.
// Responses: 200 {status:'sent', message} | 400 {status:'invalid'} | 401 {status:'unauthorized'}
//            | 404 {status:'not_found'} | 502 {status:'gmail_error', detail}.
// Deploy with --no-verify-jwt: the session is validated here against the `admins` table.
import { buildRawEmail, withSignature } from '../_shared/contact-core.ts';
import { getAccessToken, getMessageIdHeader, sendMessage } from '../_shared/gmail.ts';
import { json, preflight, recordSyncError, serviceClient } from '../_shared/http.ts';

const MAX_BODY = 10000;

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, 405, { status: 'method_not_allowed' });

  const client = serviceClient();

  // Same rule as is_admin(): a valid session whose user is listed in `admins`.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = token ? await client.auth.getUser(token) : { data: { user: null } };
  const userId = userData?.user?.id;
  if (!userId) return json(req, 401, { status: 'unauthorized' });
  const { data: admin } = await client.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (!admin) return json(req, 401, { status: 'unauthorized' });

  let input: { threadId?: unknown; body?: unknown };
  try {
    input = await req.json();
  } catch {
    return json(req, 400, { status: 'invalid' });
  }
  const threadId = typeof input.threadId === 'string' ? input.threadId : '';
  const text = typeof input.body === 'string' ? input.body.trim() : '';
  if (!threadId || !text || text.length > MAX_BODY) return json(req, 400, { status: 'invalid' });

  const { data: thread } = await client
    .from('contact_threads')
    .select('id, email, subject, gmail_thread_id, last_message_header_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return json(req, 404, { status: 'not_found' });

  const body = withSignature(text);
  try {
    const gmailAddress = Deno.env.get('GMAIL_ADDRESS')!;
    const accessToken = await getAccessToken();
    const sent = await sendMessage(
      accessToken,
      buildRawEmail({
        from: `Camilo Ayala <${gmailAddress}>`,
        to: thread.email,
        subject: `Re: ${thread.subject || 'Tu mensaje'}`,
        body,
        inReplyTo: thread.last_message_header_id,
        references: thread.last_message_header_id,
      }),
      thread.gmail_thread_id,
    );
    const headerId = await getMessageIdHeader(accessToken, sent.id);
    const now = new Date().toISOString();

    const { data: message, error } = await client
      .from('contact_messages')
      .insert({ thread_id: thread.id, direction: 'out', body, source: 'panel', gmail_message_id: sent.id })
      .select('id, created_at')
      .single();
    if (error) console.error('contact-reply: message insert failed after sending', error);

    await client
      .from('contact_threads')
      .update({
        gmail_thread_id: thread.gmail_thread_id ?? sent.threadId,
        last_message_header_id: headerId || thread.last_message_header_id,
        last_message_at: now,
        status: 'replied',
        sync_error: null,
      })
      .eq('id', thread.id);

    return json(req, 200, { status: 'sent', message: message ?? { id: null, created_at: now } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('contact-reply: gmail failed', error);
    await recordSyncError(client, detail, thread.id);
    return json(req, 502, { status: 'gmail_error', detail });
  }
});
