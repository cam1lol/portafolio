// HTTP helpers shared by the contact inbox Edge Functions (Deno runtime).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Reflects the Origin only when it is listed in ALLOWED_ORIGINS (comma separated). */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    ...(allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req) }) : null;
}

/** service_role client: bypasses RLS, only ever used server-side. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Records a Gmail failure where the admin can see it, without ever throwing. */
export async function recordSyncError(client: SupabaseClient, message: string, threadId?: string): Promise<void> {
  const text = message.slice(0, 500);
  if (threadId) await client.from('contact_threads').update({ sync_error: text }).eq('id', threadId);
  await client.from('contact_sync_state').update({ last_error: text, last_error_at: new Date().toISOString() }).eq('id', 1);
}
