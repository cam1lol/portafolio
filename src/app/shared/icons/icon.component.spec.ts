import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `<app-icon name="box" animated /><app-icon name="terminal" />`,
})
class HostComponent {}

describe('IconComponent', () => {
  it('con animated marca data-anim con el nombre del icono; sin él no', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const [animated, still] = Array.from(fixture.nativeElement.querySelectorAll('app-icon')) as HTMLElement[];
    expect(animated.getAttribute('data-anim')).toBe('box');
    expect(still.hasAttribute('data-anim')).toBeFalse();
    // Terminal keeps its look but is two strokes, so the cursor can blink on its own.
    expect(still.querySelectorAll('path').length).toBe(2);
  });
});
