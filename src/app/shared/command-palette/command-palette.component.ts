import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectsService } from '../../core/data/projects.service';
import { SiteContentService } from '../../core/data/site-content.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SoundService } from '../../core/sound/sound.service';
import { IconComponent } from '../icons/icon.component';

interface Command {
  id: string;
  group: 'go' | 'projects' | 'actions';
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

/** Minúsculas y sin tildes, para que "experiencia" encuentre "Experiencia" y "diseno" encuentre "diseño". */
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Evento de ventana que abre la paleta desde cualquier sitio (por ejemplo, la página 404). */
export const OPEN_PALETTE_EVENT = 'portfolio:open-palette';

/**
 * Paleta de comandos Ctrl+K / Cmd+K: saltar a una sección o proyecto, cambiar idioma, tema o sonido,
 * copiar el email, descargar el CV, abrir el modo reclutador o el admin. <dialog> nativo (el foco se
 * queda dentro, Esc cierra); las flechas mueven y Enter ejecuta.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [TranslocoPipe, IconComponent],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css',
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly content = inject(SiteContentService);
  private readonly theme = inject(ThemeService);
  private readonly sound = inject(SoundService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  private readonly projects = toSignal(inject(ProjectsService).getPublished(), { initialValue: [] });
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  /** El diccionario cargado (vacío hasta que llega): las etiquetas lo leen directamente, sin búsquedas prematuras. */
  private readonly dictionary = toSignal(this.transloco.selectTranslation(), { initialValue: {} as Record<string, unknown> });

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly copied = signal(false);

  private t(key: string): string {
    const value = this.dictionary()[key];
    return typeof value === 'string' ? value : key;
  }

  private readonly commands = computed<Command[]>(() => {
    const go = (fragment: string | null, path = '/') => () => void this.router.navigate([path], fragment ? { fragment } : {});
    const email = (this.content.valueFor('contact_email', 'es') || this.t('ct_b')).trim();
    const cv = this.content.valueFor('cv_url', this.lang());
    const list: Command[] = [
      { id: 'home', group: 'go', label: this.t('cmd_home'), icon: 'grid', run: go(null) },
      { id: 'work', group: 'go', label: this.t('cmd_work'), icon: 'folder', run: go('work') },
      { id: 'all', group: 'go', label: this.t('cmd_all_projects'), icon: 'layers', run: go(null, '/proyectos') },
      { id: 'xp', group: 'go', label: this.t('cmd_experience'), icon: 'briefcase', run: go('experience') },
      { id: 'services', group: 'go', label: this.t('cmd_services'), icon: 'tag', run: go('services') },
      { id: 'contact', group: 'go', label: this.t('cmd_contact'), icon: 'mail', run: go('contact') },
      ...this.projects().map<Command>((p) => ({
        id: `p-${p.slug}`,
        group: 'projects',
        label: p.name,
        hint: p.typeLabel,
        icon: p.icon,
        run: () => void this.router.navigate(['/proyectos', p.slug]),
      })),
      { id: 'recruiter', group: 'actions', label: this.t('cmd_recruiter'), icon: 'eye', run: go(null, '/reclutador') },
      ...(cv ? [{ id: 'cv', group: 'actions' as const, label: this.t('cmd_cv'), icon: 'external', run: () => void window.open(cv, '_blank', 'noopener') }] : []),
      { id: 'email', group: 'actions', label: this.t('cmd_copy_email'), hint: email, icon: 'mail', run: () => this.copyEmail(email) },
      {
        id: 'lang',
        group: 'actions',
        label: this.t('cmd_lang'),
        hint: this.lang() === 'es' ? 'EN' : 'ES',
        icon: 'type',
        run: () => this.transloco.setActiveLang(this.lang() === 'es' ? 'en' : 'es'),
      },
      { id: 'theme', group: 'actions', label: this.t('cmd_theme'), icon: 'eye', run: () => this.theme.toggle() },
      {
        id: 'sound',
        group: 'actions',
        label: this.t(this.sound.enabled() ? 'cmd_sound_off' : 'cmd_sound_on'),
        icon: 'activity',
        run: () => this.sound.toggle(),
      },
      { id: 'admin', group: 'actions', label: this.t('cmd_admin'), icon: 'layout', run: go(null, '/admin') },
    ];
    return list;
  });

  protected readonly results = computed(() => {
    const q = normalize(this.query().trim());
    const list = this.commands();
    return q ? list.filter((c) => normalize(`${c.label} ${c.hint ?? ''}`).includes(q)) : list;
  });

  protected readonly groups = computed(() => {
    const order: Command['group'][] = ['go', 'projects', 'actions'];
    return order
      .map((group) => ({ group, items: this.results().filter((c) => c.group === group) }))
      .filter((g) => g.items.length);
  });

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) return;
    this.query.set('');
    this.active.set(0);
    this.copied.set(false);
    dialog.showModal();
    this.sound.click();
    queueMicrotask(() => this.input().nativeElement.focus());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  @HostListener('window:' + OPEN_PALETTE_EVENT)
  protected onOpenRequest(): void {
    this.open();
  }

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.dialog().nativeElement.open) this.close();
      else this.open();
    }
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!count) return;
      this.active.update((i) => (i + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
      queueMicrotask(() => this.dialog().nativeElement.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = this.results()[this.active()];
      if (command) this.execute(command);
    }
  }

  protected execute(command: Command): void {
    this.sound.click();
    command.run();
    // Se mantiene abierta en los interruptores (idioma, tema, sonido, copiar) para que se vea el cambio.
    if (!['lang', 'theme', 'sound', 'email'].includes(command.id)) this.close();
  }

  protected indexOf(command: Command): number {
    return this.results().indexOf(command);
  }

  protected groupLabel(group: Command['group']): string {
    return this.t(`cmd_group_${group}`);
  }

  private copyEmail(email: string): void {
    navigator.clipboard?.writeText(email).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1800);
      },
      () => undefined,
    );
  }

  /** Un clic en el fondo la cierra (el clic cae en el propio dialog, fuera del panel). */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
