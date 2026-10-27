import { Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectTransitionService } from '../../core/transitions/project-transition.service';

/** Touches must start this close to the left edge (px), like the native back gesture. */
const EDGE = 24;
/** Movement before deciding between a horizontal swipe and a vertical scroll. */
const DECIDE = 10;
/** Release past this share of the width, or faster than this speed (px/ms), goes back. */
const DISTANCE_RATIO = 1 / 3;
const SPEED = 0.5;

/**
 * Touch screens: swiping from the left edge drags the page with the finger; releasing far or fast
 * enough goes back (to the previous screen in the app, or `fallback` when the page was opened
 * directly). Vertical scrolling is never blocked: the gesture only engages on a horizontal move.
 */
@Directive({ selector: '[appSwipeBack]', standalone: true })
export class SwipeBackDirective implements OnDestroy {
  /** Where to go when there is no previous screen in the app (page opened from a shared link). */
  readonly fallback = input('/', { alias: 'appSwipeBack' });

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly vt = inject(ProjectTransitionService);
  private readonly zone = inject(NgZone);

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private dx = 0;
  /** null: touch started away from the edge; 'pending': undecided; then swipe or scroll. */
  private mode: null | 'pending' | 'swipe' | 'scroll' = null;

  private readonly onStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || touch.clientX > EDGE) return;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = event.timeStamp;
    this.dx = 0;
    this.mode = 'pending';
  };

  private readonly onMove = (event: TouchEvent) => {
    if (!this.mode || this.mode === 'scroll') return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    if (this.mode === 'pending') {
      if (Math.abs(dy) > DECIDE && Math.abs(dy) > Math.abs(dx)) {
        this.mode = 'scroll';
        return;
      }
      if (dx < DECIDE) return;
      this.mode = 'swipe';
      this.el.style.transition = 'none';
      this.el.style.willChange = 'transform';
      this.el.style.boxShadow = '-16px 0 40px rgba(0, 0, 0, .45)';
    }
    event.preventDefault(); // the page follows the finger instead of scrolling
    this.dx = Math.max(0, dx);
    this.el.style.transform = `translateX(${this.dx}px)`;
  };

  private readonly onEnd = (event: TouchEvent) => {
    if (this.mode !== 'swipe') {
      this.mode = null;
      return;
    }
    this.mode = null;
    const width = this.el.getBoundingClientRect().width || window.innerWidth;
    const speed = this.dx / Math.max(1, event.timeStamp - this.startTime);
    const goBack = this.dx > width * DISTANCE_RATIO || speed > SPEED;
    this.el.style.transition = 'transform .22s cubic-bezier(.2, .7, .2, 1)';
    this.el.style.transform = goBack ? 'translateX(100%)' : 'translateX(0)';
    if (goBack) {
      setTimeout(() => this.zone.run(() => this.navigateBack()), 200);
    } else {
      setTimeout(() => this.reset(), 230);
    }
  };

  constructor() {
    // Listeners outside Angular (no change detection per touchmove); touchmove is not passive so
    // the swipe can stop the page from scrolling once it is clearly horizontal.
    this.zone.runOutsideAngular(() => {
      this.el.addEventListener('touchstart', this.onStart, { passive: true });
      this.el.addEventListener('touchmove', this.onMove, { passive: false });
      this.el.addEventListener('touchend', this.onEnd, { passive: true });
      this.el.addEventListener('touchcancel', this.onEnd, { passive: true });
    });
  }

  private navigateBack(): void {
    // The page already slid away with the finger: no second animation.
    this.vt.skipNextTransition();
    const cameFromApp = !!this.router.lastSuccessfulNavigation?.previousNavigation;
    if (cameFromApp) this.location.back();
    else this.router.navigateByUrl(this.fallback());
  }

  private reset(): void {
    this.el.style.transition = '';
    this.el.style.transform = '';
    this.el.style.willChange = '';
    this.el.style.boxShadow = '';
  }

  ngOnDestroy(): void {
    this.el.removeEventListener('touchstart', this.onStart);
    this.el.removeEventListener('touchmove', this.onMove);
    this.el.removeEventListener('touchend', this.onEnd);
    this.el.removeEventListener('touchcancel', this.onEnd);
  }
}
