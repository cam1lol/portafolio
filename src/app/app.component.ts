import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { HudComponent } from './shared/hud/hud.component';
import { ThemeService } from './core/theme/theme.service';
import { SummoningCircleComponent } from './core/background/summoning-circle.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HudComponent, SummoningCircleComponent, TranslocoPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly router = inject(Router);
  protected readonly transloco = inject(TranslocoService);
  protected readonly themeService = inject(ThemeService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isAdminScreen = computed(() => this.currentUrl().startsWith('/admin'));

  setLang(lang: 'es' | 'en'): void {
    this.transloco.setActiveLang(lang);
  }

  goTo(screen: 'site' | 'admin'): void {
    this.router.navigate([screen === 'site' ? '/' : '/admin']);
  }

  setTheme(theme: 'day' | 'night'): void {
    this.themeService.set(theme);
  }
}
