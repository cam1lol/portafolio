import { Directive, ElementRef, HostListener, booleanAttribute, inject, input, output } from '@angular/core';

/**
 * Ctrl/Cmd + S guarda el formulario en vez de abrir el diálogo "Guardar página" del navegador.
 * `<form (appSaveShortcut)="submit()">`. Con `saveShortcutScoped`, solo actúa si el foco está dentro
 * de este elemento (páginas con varios formularios, como Textos del sitio).
 */
@Directive({ selector: '[appSaveShortcut]', standalone: true })
export class SaveShortcutDirective {
  readonly appSaveShortcut = output<void>();
  readonly scoped = input(false, { alias: 'saveShortcutScoped', transform: booleanAttribute });

  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's' || event.altKey || event.shiftKey) return;
    if (this.scoped() && !this.host.contains(document.activeElement)) return;
    event.preventDefault();
    this.appSaveShortcut.emit();
  }
}
