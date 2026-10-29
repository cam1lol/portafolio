import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Protege `/admin/**`. Hace su propia llamada a `getSession()` en vez de leer
 * `AuthService.session()`: esa señal se llena de forma asíncrona en el constructor del
 * servicio y el guard podría ejecutarse antes de que exista la sesión inicial.
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
