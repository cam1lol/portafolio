import { TestBed } from '@angular/core/testing';
import { VisitsChartComponent, bucketVisitsByDay } from './visits-chart.component';

describe('bucketVisitsByDay', () => {
  const today = new Date(2026, 9, 26, 15, 0); // 26 Oct 2026, local time

  it('devuelve un día por posición, del más antiguo a hoy, incluidos los días sin visitas', () => {
    const days = bucketVisitsByDay([], 30, today);
    expect(days.length).toBe(30);
    expect(days[29].date).toBe('2026-10-26');
    expect(days[0].date).toBe('2026-09-27');
    expect(days.every((day) => day.count === 0)).toBeTrue();
  });

  it('cuenta las visitas en su día local e ignora las de fuera del rango', () => {
    const visits = [
      new Date(2026, 9, 26, 9).toISOString(),
      new Date(2026, 9, 26, 23, 30).toISOString(),
      new Date(2026, 9, 25, 0, 5).toISOString(),
      new Date(2026, 8, 1).toISOString(),
    ];
    const days = bucketVisitsByDay(visits, 30, today);
    expect(days[29].count).toBe(2);
    expect(days[28].count).toBe(1);
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });
});

describe('VisitsChartComponent', () => {
  it('dibuja una barra por día, rotula el máximo y ofrece la tabla', () => {
    const fixture = TestBed.createComponent(VisitsChartComponent);
    const days = bucketVisitsByDay([], 30, new Date(2026, 9, 26)).map((day, index) => ({ ...day, count: index === 10 ? 7 : 1 }));
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('.bar').length).toBe(30);
    expect(root.querySelector('.peak-label')?.textContent).toContain('7');
    expect(root.querySelector('.summary')?.textContent).toContain('36');
    expect(root.querySelectorAll('table tbody tr').length).toBe(30);
  });
});
