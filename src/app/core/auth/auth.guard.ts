import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Protects `/admin/**`. Deliberately resolves its own `getSession()` call
 * instead of reading `AuthService.session()` — that signal is populated
 * asynchronously in the service constructor, so depending on it here could
 * race against the guard running before the initial session has loaded.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return from(supabase.client.auth.getSession()).pipe(
    map(({ data }) => {
      if (data.session) {
        return true;
      }
      return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
    }),
  );
};
