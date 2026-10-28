import { TestBed } from '@angular/core/testing';
import { ScrollFrameService } from './scroll-frame.service';
import { idleLoop, prefersLightEffects } from './perf-utils';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('ScrollFrameService', () => {
  it('en cada fotograma mide todas las tareas antes de escribir ninguna', async () => {
    const service = TestBed.inject(ScrollFrameService);
    const log: string[] = [];
    const offA = service.register({ read: () => log.push('read A'), write: () => log.push('write A') });
    const offB = service.register({ read: () => log.push('read B'), write: () => log.push('write B') });
    await nextFrame();
    await nextFrame();
    expect(log).toEqual(['read A', 'read B', 'write A', 'write B']);
    offA();
    offB();
  });

  it('un scroll agrupa en un solo fotograma y deja de escuchar sin tareas', async () => {
    const service = TestBed.inject(ScrollFrameService);
    let writes = 0;
    const off = service.register({ write: () => writes++ });
    await nextFrame();
    writes = 0;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    expect(writes).toBe(1);
    off();
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    expect(writes).toBe(1);
  });
});

describe('idleLoop', () => {
  it('corre mientras el paso devuelve true, se duerme y se despierta con wake()', async () => {
    let steps = 0;
    let remaining = 3;
    const loop = idleLoop(() => {
      steps++;
      return --remaining > 0;
    });
    loop.wake();
    for (let i = 0; i < 6; i++) await nextFrame();
    expect(steps).toBe(3);
    remaining = 1;
    loop.wake();
    await nextFrame();
    await nextFrame();
    expect(steps).toBe(4);
    loop.stop();
    loop.wake();
    await nextFrame();
    expect(steps).toBe(4);
  });
});

describe('prefersLightEffects', () => {
  it('se activa con el modo ligero', () => {
    document.documentElement.classList.add('fx-lite');
    expect(prefersLightEffects()).toBeTrue();
    document.documentElement.classList.remove('fx-lite');
  });
});
