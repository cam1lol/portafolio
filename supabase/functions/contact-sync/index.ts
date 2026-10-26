// Inbound sync, called by pg_cron every 5 minutes (migration 0008) with the x-cron-secret header.
// Copies new Gmail messages of open conversations into contact_messages.
// Responses: 200 {threads, inserted} | 401 {status:'unauthorized'}.
// Deploy with --no-verify-jwt: the shared secret is checked here.
import { extractMessage, isFromAddress, nextStatus, stripQuotedReply, type Direction, type ThreadStatus } from '../_shared/contact-core.ts';
import { GmailAuthError, getAccessToken, getThread } from '../_shared/gmail.ts';
import { json, recordSyncError, serviceClient } from '../_shared/http.ts';

const ACTIVE_DAYS = 60;
const MAX_BODY = 10000;

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json(req, 401, { status: 'unauthorized' });

  const client = serviceClient();
  const gmailAddress = Deno.env.get('GMAIL_ADDRESS')!;

  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    const message = error instanceof GmailAuthError ? `Autorización de Gmail: ${error.message}` : String(error);
    await recordSyncError(client, message);
    return json(req, 200, { threads: 0, inserted: 0, error: message });
  }

  const since = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: threads, error } = await client
    .from('contact_threads')
    .select('id, status, gmail_thread_id')
    .neq('status', 'archived')
    .not('gmail_thread_id', 'is', null)
    .gte('last_message_at', since);
  if (error) {
    await recordSyncError(client, `Lectura de conversaciones: ${error.message}`);
    return json(req, 200, { threads: 0, inserted: 0, error: error.message });
  }

  let inserted = 0;
  for (const thread of threads ?? []) {
    try {
      inserted += await syncThread(client, token, gmailAddress, thread as { id: string; status: ThreadStatus; gmail_thread_id: string });
    } catch (threadError) {
      await recordSyncError(client, threadError instanceof Error ? threadError.message : String(threadError), thread.id);
    }
  }

  await client.from('contact_sync_state').update({ last_sync_at: new Date().toISOString() }).eq('id', 1);
  return json(req, 200, { threads: threads?.length ?? 0, inserted });
});

async function syncThread(
  client: ReturnType<typeof serviceClient>,
  token: string,
  gmailAddress: string,
  thread: { id: string; status: ThreadStatus; gmail_thread_id: string },
): Promise<number> {
  const gmailThread = await getThread(token, thread.gmail_thread_id);
  // Drafts live in the thread too; only sent or received mail belongs in the conversation.
  const messages = (gmailThread.messages ?? [])
    .filter((message) => !(message.labelIds ?? []).includes('DRAFT'))
    .sort((a, b) => Number(a.internalDate) - Number(b.internalDate));
  if (messages.length === 0) return 0;

  const rows = messages.map((message) => {
    const extracted = extractMessage(message.payload);
    const direction: Direction = isFromAddress(extracted.from, gmailAddress) ? 'out' : 'in';
    return {
      row: {
        thread_id: thread.id,
        direction,
        body: (stripQuotedReply(extracted.body) || '(sin texto)').slice(0, MAX_BODY),
        source: 'gmail',
        gmail_message_id: message.id,
        created_at: new Date(Number(message.internalDate)).toISOString(),
      },
      headerId: extracted.messageIdHeader,
    };
  });

  // Unique gmail_message_id + ignoreDuplicates: overlapping runs never insert twice, and
  // messages stored by contact-submit / contact-reply are skipped.
  const { data: insertedRows, error } = await client
    .from('contact_messages')
    .upsert(rows.map((item) => item.row), { onConflict: 'gmail_message_id', ignoreDuplicates: true })
    .select('direction');
  if (error) throw new Error(`Guardado de mensajes: ${error.message}`);

  const newDirections = (insertedRows ?? []).map((row) => row.direction as Direction);
  const last = rows[rows.length - 1];
  await client
    .from('contact_threads')
    .update({
      ...(newDirections.length > 0 ? { status: nextStatus(thread.status, newDirections), last_message_at: last.row.created_at } : {}),
      last_message_header_id: last.headerId || undefined,
      sync_error: null,
    })
    .eq('id', thread.id);

  return newDirections.length;
}
