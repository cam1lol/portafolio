import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { AdminCommentsComponent } from './admin-comments.component';
import { CommentRow, CommentsService } from '../../../core/data/comments.service';
import { ConfirmDialogService } from '../shared/confirm-dialog.service';
import { ToastService } from '../shared/toast.service';

const comment = (id: string, approved: boolean): CommentRow => ({
  id, author: `Autor ${id}`, lang: 'es', body: `Texto ${id}`, approved, created_at: '2026-10-25T00:00:00Z',
});

describe('AdminCommentsComponent', () => {
  let fixture: ComponentFixture<AdminCommentsComponent>;
  let service: jasmine.SpyObj<CommentsService>;
  let toast: jasmine.SpyObj<ToastService>;

  const root = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(root().querySelectorAll('.comment-card'));
  const click = (selector: string) => {
    root().querySelector<HTMLElement>(selector)!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj('CommentsService', ['getAll', 'watchNew', 'approve', 'approveMany', 'hide', 'delete', 'deleteMany']);
    service.getAll.and.returnValue(of([comment('a', false), comment('b', true), comment('c', false)]));
    service.watchNew.and.returnValue(NEVER);
    service.approveMany.and.returnValue(of(undefined));
    toast = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [AdminCommentsComponent],
      providers: [
        { provide: CommentsService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCommentsComponent);
    fixture.detectChanges();
  });

  it('filtra por pendientes y aprobados', () => {
    expect(rows().length).toBe(3);
    click('[data-filter="pending"]');
    expect(rows().length).toBe(2);
    click('[data-filter="approved"]');
    expect(rows().length).toBe(1);
  });

  it('aprueba los seleccionados en bloque y avisa', () => {
    click('[data-filter="pending"]');
    click('.select-all');
    click('.bulk-approve');
    expect(service.approveMany).toHaveBeenCalledWith(['a', 'c']);
    expect(toast.show).toHaveBeenCalledWith('2 comentarios aprobados.');
    expect(rows().length).toBe(0);
  });
});
