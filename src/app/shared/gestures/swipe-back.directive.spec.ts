import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { SwipeBackDirective } from './swipe-back.directive';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';

@Component({
  standalone: true,
  imports: [SwipeBackDirective],
  template: `<main appSwipeBack="/proyectos" style="display:block;width:400px;height:600px"></main>`,
})
class HostComponent {}

function touch(el: HTMLElement, type: string, x: number, y: number, timeStamp?: number) {
  const point = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  const event = new TouchEvent(type, {
    touches: type === 'touchend' ? [] : [point],
    changedTouches: [point],
    bubbles: true,
    cancelable: true,
  });
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  el.dispatchEvent(event);
  return event;
}

describe('SwipeBackDirective', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('main') as HTMLElement;
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const back = spyOn(TestBed.inject(Location), 'back');
    const skip = spyOn(TestBed.inject(ProjectTransitionService), 'skipNextTransition');
    return { el, navigate, back, skip };
  }

  it('desde el borde, la página sigue al dedo y al soltar lejos vuelve (sin segunda animación)', fakeAsync(() => {
    const { el, navigate, skip } = setup();
    touch(el, 'touchstart', 10, 300, 0);
    touch(el, 'touchmove', 40, 302, 50);
    const move = touch(el, 'touchmove', 200, 305, 400);
    expect(move.defaultPrevented).toBeTrue();
    expect(el.style.transform).toBe('translateX(190px)');
    touch(el, 'touchend', 200, 305, 800);
    tick(250);
    expect(skip).toHaveBeenCalled();
    // Opened directly (no previous screen in the app): goes to the fallback.
    expect(navigate).toHaveBeenCalledWith('/proyectos');
  }));

  it('si se suelta cerca y despacio, la página regresa a su sitio', fakeAsync(() => {
    const { el, navigate, back } = setup();
    touch(el, 'touchstart', 10, 300, 0);
    touch(el, 'touchmove', 40, 300, 100);
    touch(el, 'touchmove', 70, 300, 600);
    touch(el, 'touchend', 70, 300, 1000);
    tick(300);
    expect(navigate).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(el.style.transform).toBe('');
  }));

  it('lejos del borde o con movimiento vertical no hace nada (no bloquea el scroll)', fakeAsync(() => {
    const { el, navigate } = setup();
    touch(el, 'touchstart', 120, 300, 0);
    const far = touch(el, 'touchmove', 300, 300, 100);
    expect(far.defaultPrevented).toBeFalse();
    touch(el, 'touchend', 300, 300, 150);

    touch(el, 'touchstart', 10, 300, 200);
    const vertical = touch(el, 'touchmove', 14, 360, 250);
    expect(vertical.defaultPrevented).toBeFalse();
    touch(el, 'touchmove', 200, 400, 300);
    touch(el, 'touchend', 200, 400, 350);
    tick(300);
    expect(el.style.transform).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  }));
});
