import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminPageHeaderComponent } from './admin-page-header.component';

@Component({
  standalone: true,
  imports: [AdminPageHeaderComponent],
  template: `
    <app-admin-page-header icon="folder" title="Proyectos" description="Las tarjetas de la sección." [count]="3" countLabel="publicados">
      <a class="action">NUEVO PROYECTO</a>
    </app-admin-page-header>
  `,
})
class HostComponent {}

describe('AdminPageHeaderComponent', () => {
  it('muestra icono, título, descripción, contador y las acciones proyectadas', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Proyectos');
    expect(root.querySelector('.description')?.textContent).toContain('Las tarjetas de la sección.');
    expect(root.querySelector('.count')?.textContent).toContain('3');
    expect(root.querySelector('.count')?.textContent).toContain('publicados');
    expect(root.querySelector('app-icon')).not.toBeNull();
    expect(root.querySelector('.actions .action')?.textContent).toContain('NUEVO PROYECTO');
  });
});
