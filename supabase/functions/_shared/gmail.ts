// Gmail API over HTTPS with an OAuth refresh token (Deno runtime).
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
import type { GmailPart } from './contact-core.ts';

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** The refresh token was revoked, expired (consent screen back in "Testing") or is wrong. */
export class GmailAuthError extends Error {}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

export async function getAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const reason = `${data.error ?? response.status}: ${data.error_description ?? 'no access token'}`;
    if (data.error === 'invalid_grant' || data.error === 'invalid_client' || data.error === 'unauthorized_client') {
      throw new GmailAuthError(`Google OAuth ${reason}`);
    }
    throw new Error(`Google OAuth ${reason}`);
  }
  return data.access_token as string;
}

async function gmail<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GMAIL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    if (response.status === 401) throw new GmailAuthError(`Gmail 401: ${detail}`);
    throw new Error(`Gmail ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

export function sendMessage(token: string, raw: string, threadId?: string | null): Promise<{ id: string; threadId: string }> {
  return gmail(token, '/messages/send', {
    method: 'POST',
    body: JSON.stringify(threadId ? { raw, threadId } : { raw }),
  });
}

/** RFC `Message-ID` of a sent message, needed for In-Reply-To / References on the next reply. */
export async function getMessageIdHeader(token: string, messageId: string): Promise<string> {
  const message = await gmail<{ payload?: GmailPart }>(
    token,
    `/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Message-ID`,
  );
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === 'message-id')?.value ?? '';
}

export function getThread(
  token: string,
  threadId: string,
): Promise<{ id: string; messages: { id: string; internalDate: string; payload: GmailPart }[] }> {
  return gmail(token, `/threads/${encodeURIComponent(threadId)}?format=full`);
}
