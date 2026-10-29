import { Injectable, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Envuelve Supabase Auth (`signInWithPassword`/`signOut`) y expone la sesión como señal,
 * sincronizada con `onAuthStateChange` (login/logout en otra pestaña, renovación del token y
 * caducidad, no solo la carga inicial).
 *
 * `authGuard` NO lee `session()` a propósito: hace su propio `getSession()` para no competir
 * con el trabajo asíncrono de este constructor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);

  constructor() {
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  login(email: string, password: string): Observable<void> {
    return from(this.supabase.client.auth.signInWithPassword({ email, password })).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      }),
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.client.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      }),
    );
  }
}
