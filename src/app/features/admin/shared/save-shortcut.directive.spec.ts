import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SaveShortcutDirective } from './save-shortcut.directive';

@Component({
  standalone: true,
  imports: [SaveShortcutDirective],
  template: `
    <form id="a" (appSaveShortcut)="saved.push('a')" saveShortcutScoped><input id="in-a" /></form>
    <form id="b" (appSaveShortcut)="saved.push('b')" saveShortcutScoped><input id="in-b" /></form>
    <section (appSaveShortcut)="saved.push('page')"></section>
  `,
})
class HostComponent {
  saved: string[] = [];
}

describe('SaveShortcutDirective', () => {
  const press = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { key: 's', cancelable: true, bubbles: true, ...init });
    document.dispatchEvent(event);
    return event;
  };

  it('Ctrl+S guarda, evita el diálogo del navegador y respeta el formulario con foco', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    (fixture.nativeElement.querySelector('#in-b') as HTMLInputElement).focus();

    const event = press({ ctrlKey: true });
    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.saved).toEqual(['b', 'page']);

    press({ key: 's' });
    press({ ctrlKey: true, shiftKey: true });
    expect(fixture.componentInstance.saved.length).toBe(2);
    fixture.nativeElement.remove();
  });
});
