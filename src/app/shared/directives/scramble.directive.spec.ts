import { Component, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScrambleDirective } from './scramble.directive';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';

@Component({
  standalone: true,
  imports: [ScrambleDirective],
  template: `<h1 [appScramble]="text()"></h1>`,
})
class HostComponent {
  readonly text = signal('VELAMENTUM');
}

describe('ScrambleDirective', () => {
  const frames: FrameRequestCallback[] = [];
  let now = 0;

  beforeEach(() => {
    frames.length = 0;
    now = 0;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb) => frames.push(cb));
    spyOn(window, 'cancelAnimationFrame');
    spyOn(performance, 'now').and.callFake(() => now);
  });

  const step = (ms: number) => {
    now += ms;
    const pending = frames.splice(0);
    pending.forEach((cb) => cb(now));
  };

  it('decodifica el texto y termina con el texto real; los lectores de pantalla leen el texto real', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    step(200);
    expect(h1.getAttribute('aria-label')).toBe('VELAMENTUM');
    expect(h1.querySelector('[aria-hidden=true]')!.textContent!.length).toBe('VELAMENTUM'.length);
    step(1000);
    expect(h1.textContent).toBe('VELAMENTUM');
    expect(h1.hasAttribute('aria-label')).toBeFalse();
  });

  it('espera a que termine la transición: mientras tanto muestra el texto tal cual', fakeAsync(() => {
    const vt = TestBed.inject(ProjectTransitionService);
    vt.transitioning.set(true);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent).toBe('VELAMENTUM');
    expect(frames.length).toBe(0);
    vt.transitioning.set(false);
    fixture.detectChanges();
    tick();
    expect(frames.length).toBeGreaterThan(0); // the decode started
  }));
});
