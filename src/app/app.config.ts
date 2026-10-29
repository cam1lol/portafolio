import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './core/i18n/transloco-http.loader';
import { ProjectTransitionService } from './core/transitions/project-transition.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // anchorScrolling: "Ver en el sitio" abre /#seccion y cae en esa sección.
    // View transitions: paso animado entre las tarjetas y las páginas de proyecto (ver ProjectTransitionService).
    provideRouter(
      routes,
      // Las páginas nuevas empiezan arriba (el título del proyecto se ve para la transición de apertura);
      // atrás/adelante recupera donde estabas.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: (info) => inject(ProjectTransitionService).onRouterTransition(info),
      }),
    ),
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
