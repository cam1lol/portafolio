import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreviewPlayDirective } from './preview-play.directive';

@Component({
  standalone: true,
  imports: [PreviewPlayDirective],
  template: `<div class="card"><video appPreviewPlay muted></video></div>`,
})
class HostComponent {}

describe('PreviewPlayDirective', () => {
  function setup(media: Record<string, boolean>) {
    spyOn(window, 'matchMedia').and.callFake(
      (query: string) => ({ matches: !!media[query], addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    );
    const play = spyOn(HTMLMediaElement.prototype, 'play').and.resolveTo();
    const pause = spyOn(HTMLMediaElement.prototype, 'pause');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
    return { play, pause, card };
  }

  it('con mouse: reproduce al entrar en la tarjeta y pausa al salir', () => {
    const { play, pause, card } = setup({ '(pointer: fine)': true });
    card.dispatchEvent(new MouseEvent('mouseenter'));
    expect(play).toHaveBeenCalled();
    card.dispatchEvent(new MouseEvent('mouseleave'));
    expect(pause).toHaveBeenCalled();
  });

  it('con reducir movimiento nunca reproduce solo', () => {
    const { play, card } = setup({ '(pointer: fine)': true, '(prefers-reduced-motion: reduce)': true });
    card.dispatchEvent(new MouseEvent('mouseenter'));
    expect(play).not.toHaveBeenCalled();
  });
});
