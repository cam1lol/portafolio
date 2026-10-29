import { hoursFromVisitor } from './contact-clock.component';

describe('hoursFromVisitor', () => {
  it('diferencia de Bogotá (UTC-5) con la zona del visitante', () => {
    expect(hoursFromVisitor(-5 * 60)).toBe(0);
    expect(hoursFromVisitor(60)).toBe(-6); // Madrid en invierno (UTC+1): Bogotá va 6 h por detrás
    expect(hoursFromVisitor(-8 * 60)).toBe(3); // Los Ángeles (UTC-8): Bogotá va 3 h por delante
    expect(hoursFromVisitor(5.5 * 60)).toBe(-10.5); // India (UTC+5:30)
  });
});
