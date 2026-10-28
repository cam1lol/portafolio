import { Component, DestroyRef, ElementRef, HostListener, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet, ViewportScroller } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { HudComponent } from './shared/hud/hud.component';
import { BootComponent } from './shared/boot/boot.component';
import { CommandPaletteComponent } from './shared/command-palette/command-palette.component';
import { SoundService } from './core/sound/sound.service';
import { ProjectTransitionService, RING_BURST_EVENT } from './core/transitions/project-transition.service';
import { ThemeService } from './core/theme/theme.service';
import { RingLayerComponent } from './core/background/ring-layer.component';
import { StarRainComponent } from './core/background/star-rain.component';
import { RITUAL_EVENT } from './core/background/ring-layer.component';
import { ModalComponent } from './shared/modal/modal.component';
import { SupabaseService } from './core/supabase/supabase.service';
import { SceneService } from './core/scene/scene.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NgTemplateOutlet, HudComponent, BootComponent, CommandPaletteComponent, RingLayerComponent, StarRainComponent, ModalComponent, TranslocoPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly router   = inject(Router);
  private readonly supabase = inject(SupabaseService);
  protected readonly transloco = inject(TranslocoService);
  protected readonly themeService = inject(ThemeService);
  protected readonly sound = inject(SoundService);
  protected readonly vt = inject(ProjectTransitionService);
  private readonly scene = inject(SceneService);

  ngOnInit(): void {
    this.trackVisit();
  }

  private trackVisit(): void {
    const path = location.pathname;
    const lang = this.transloco.getActiveLang() === 'en' ? 'en' : 'es';
    this.supabase.client
      .from('visits')
      .insert({ path, lang })
      .then(({ error }) => {
        if (!error) return;
        // PGRST204: `visits.lang` does not exist yet (migration 0006 pending); keep counting visits.
        if (error.code === 'PGRST204') {
          this.supabase.client.from('visits').insert({ path }).then(({ error: retryError }) => {
            if (retryError) console.error('Failed to record visit', retryError);
          });
          return;
        }
        console.error('Failed to record visit', error);
      });
  }

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isAdminScreen = computed(() => this.currentUrl().startsWith('/admin'));

  /** First-visit intro on the home page (see BootComponent). */
  protected readonly showBoot = signal(this.scene.initial.scene_boot !== 'off' && BootComponent.shouldShow(location.pathname));

  // ---- Mobile menu (below 1280px the nav links live in a panel opened from the header)

  protected readonly menuOpen = signal(false);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly siteHeader = viewChild<ElementRef<HTMLElement>>('siteHeader');

  constructor() {
    this.wireSounds();
    // Intro turned off in Escena (first visit, before the cache knew it): close it as soon as we know.
    effect(() => {
      if (this.scene.settings().scene_boot === 'off') this.showBoot.set(false);
    });

    // Router anchor jumps (/#contact) land below the sticky header, whatever its height on this screen.
    inject(ViewportScroller).setOffset(() => [0, (this.siteHeader()?.nativeElement.offsetHeight ?? 69) + 12]);
    // Any navigation (a link, back button, Sitio/Admin) closes the panel.
    effect(() => {
      this.currentUrl();
      this.menuOpen.set(false);
    });
    // Growing past the breakpoint (rotating a tablet) must not leave a hidden panel "open".
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onChange = (event: MediaQueryListEvent) => event.matches && this.menuOpen.set(false);
    desktop.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => desktop.removeEventListener('change', onChange));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    // After the panel is rendered (a microtask is too early: it is still display:none).
    if (this.menuOpen()) setTimeout(() => this.menuItems()[0]?.focus());
  }

  protected closeMenu(returnFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.menuButton()?.nativeElement.focus();
  }

  /** Choosing a link closes the panel; the controls (language, theme) keep it open. */
  protected onMenuClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('a')) this.closeMenu();
  }

  /** Keeps Tab inside the button + panel while the panel is open. */
  protected onMenuKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen() || event.key !== 'Tab') return;
    const focusables = [this.menuButton()?.nativeElement, ...this.menuItems()].filter((el): el is HTMLElement => !!el);
    const index = focusables.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? index - 1 : index + 1;
    if (next < 0 || next >= focusables.length) {
      event.preventDefault();
      focusables[event.shiftKey ? focusables.length - 1 : 0].focus();
    }
  }

  /** Interface sounds (only when the visitor turned sound on; SoundService checks it). */
  private wireSounds(): void {
    const interactive = 'a, button, [role="button"]';
    let lastTarget: Element | null = null;
    document.addEventListener('pointerover', (event) => {
      const hit = (event.target as Element | null)?.closest?.(interactive) ?? null;
      if (hit && hit !== lastTarget && event.pointerType === 'mouse') this.sound.tick();
      lastTarget = hit;
    }, { passive: true });
    document.addEventListener('click', (event) => {
      if ((event.target as Element | null)?.closest?.(interactive)) this.sound.click();
    }, { passive: true, capture: true });
    window.addEventListener(RING_BURST_EVENT, () => this.sound.whoosh());
    window.addEventListener(RITUAL_EVENT, () => this.sound.ritual());
  }

  // ---- Easter egg: Konami code, or typing "ritual" outside form fields.

  private keyTrail: string[] = [];

  @HostListener('document:keydown', ['$event'])
  protected onSecretKey(event: KeyboardEvent): void {
    const target = event.target;
    const typing = target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]');
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    this.keyTrail = [...this.keyTrail, event.key.toLowerCase()].slice(-10);
    const trail = this.keyTrail.join(' ');
    const konami = 'arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a';
    if (trail.endsWith(konami) || this.keyTrail.slice(-6).join('') === 'ritual') {
      this.keyTrail = [];
      window.dispatchEvent(new Event(RITUAL_EVENT));
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu(true);
  }

  /** Visible links and buttons of the panel, in tab order. */
  private menuItems(): HTMLElement[] {
    const nav = this.siteHeader()?.nativeElement.querySelector('#site-menu');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll<HTMLElement>('a, button')).filter((el) => el.offsetParent !== null);
  }

  setLang(lang: 'es' | 'en'): void {
    this.transloco.setActiveLang(lang);
  }

  /**
   * Logo and name: the router link takes any page to "/"; already on the home page (where the router
   * ignores a same-URL link), it scrolls back to the top instead.
   */
  protected goHome(): void {
    if (this.router.url.split(/[?#]/)[0] !== '/' || this.router.url.includes('#')) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  goTo(screen: 'site' | 'admin'): void {
    this.router.navigate([screen === 'site' ? '/' : '/admin']);
  }

  setTheme(theme: 'day' | 'night'): void {
    this.themeService.set(theme);
  }
}
