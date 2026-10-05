import { Injectable, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Wraps Supabase Auth (`signInWithPassword`/`signOut`) and exposes the
 * current session as a signal kept in sync via `onAuthStateChange` (covers
 * login/logout from another tab, token refresh, and expiry — not just the
 * initial load).
 *
 * `authGuard` (`./auth.guard.ts`) intentionally does NOT read `session()`
 * from this service: it resolves its own `getSession()` call so route
 * activation never races against this service's async constructor work.
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
