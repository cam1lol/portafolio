import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

export type ContactTopic = 'project' | 'job' | 'other';

/** Evento de ventana que abre el formulario de contacto desde cualquier sitio, p. ej. "Cotizar esto" en un servicio. */
export const OPEN_CONTACT_EVENT = 'portfolio:open-contact';

export interface OpenContactDetail {
  /** Servicio del que se pide presupuesto: fija el tema y empieza el mensaje. */
  service?: string;
  /** Recupera el foco al cerrar el formulario (por defecto, el botón de contacto). */
  returnFocusTo?: HTMLElement | null;
}

export interface ContactSubmitInput {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  lang: 'es' | 'en';
  /** Trampa para bots: siempre vacío para las personas. */
  website: string;
}

export type ContactSubmitResult = 'received' | 'rate_limited' | 'error';

const TOPIC_SUBJECT: Record<ContactTopic, string> = { project: 'Proyecto', job: 'Oferta de trabajo', other: 'Consulta' };

/**
 * Parte pública de la bandeja de contacto. El mensaje se guarda en Supabase (copia y límite de
 * envíos) y llega por correo a través de Web3Forms; basta con que funcione uno de los dos.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly supabase = inject(SupabaseService);

  async submit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
    // Los bots reciben la misma respuesta que las personas, así la trampa no se nota.
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
