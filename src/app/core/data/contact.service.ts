import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

export type ContactTopic = 'project' | 'job' | 'other';

export interface ContactSubmitInput {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  lang: 'es' | 'en';
  /** Honeypot: always empty for people. */
  website: string;
}

export type ContactSubmitResult = 'received' | 'rate_limited' | 'error';

const TOPIC_SUBJECT: Record<ContactTopic, string> = { project: 'Proyecto', job: 'Oferta de trabajo', other: 'Consulta' };

/**
 * Public side of the contact inbox. The message is stored in Supabase (backup, rate limit)
 * and emailed to Camilo through Web3Forms; success needs at least one of the two.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly supabase = inject(SupabaseService);

  async submit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
    // Bots get the same answer as people, so the trap stays invisible.
    if (input.website) return 'received';

    const stored = await this.store(input);
    if (stored === 'rate_limited') return 'rate_limited';
    if (stored === 'invalid') return 'error';

    const emailed = await this.email(input);
    return stored === 'received' || emailed ? 'received' : 'error';
  }

  private async store(input: ContactSubmitInput): Promise<'received' | 'rate_limited' | 'invalid' | 'failed'> {
    const { data, error } = await this.supabase.client.rpc('submit_contact', {
      p_name: input.name,
      p_email: input.email,
      p_topic: input.topic,
      p_message: input.message,
      p_lang: input.lang,
    });
    if (error) {
      console.error('Failed to store contact message', error);
      return 'failed';
    }
    if (data === 'received' || data === 'rate_limited') return data;
    return typeof data === 'string' && data.startsWith('invalid') ? 'invalid' : 'failed';
  }

  private async email(input: ContactSubmitInput): Promise<boolean> {
    if (!environment.web3formsKey) return false;
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: environment.web3formsKey,
          subject: `Portafolio · ${TOPIC_SUBJECT[input.topic]} · ${input.name}`,
          from_name: 'Portafolio Camilo Ayala',
          name: input.name,
          email: input.email,
          topic: TOPIC_SUBJECT[input.topic],
          language: input.lang.toUpperCase(),
          message: input.message,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { success?: boolean };
      return response.ok && result.success === true;
    } catch (error) {
      console.error('Failed to email contact message', error);
      return false;
    }
  }
}
