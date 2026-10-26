import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface ContactSubmitInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  lang: 'es' | 'en';
  /** Honeypot: always empty for people. */
  website: string;
}

export type ContactSubmitResult = 'received' | 'invalid' | 'rate_limited' | 'error';

/** Public side of the contact inbox: posts to the `contact-submit` Edge Function. */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly supabase = inject(SupabaseService);

  async submit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
    const { data, error } = await this.supabase.client.functions.invoke('contact-submit', { body: input });
    if (!error) return (data as { status?: string } | null)?.status === 'received' ? 'received' : 'error';

    // FunctionsHttpError keeps the HTTP response in `context`.
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) return 'rate_limited';
    if (status === 400) return 'invalid';
    console.error('Contact form submission failed', error);
    return 'error';
  }
}
