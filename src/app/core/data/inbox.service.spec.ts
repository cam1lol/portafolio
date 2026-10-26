import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { InboxService, InboxThread } from './inbox.service';
import { SupabaseService } from '../supabase/supabase.service';

/** Records every query-builder call and resolves with `result`, like a supabase-js builder. */
function fakeClient(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq', 'update', 'delete', 'limit', 'maybeSingle', 'single']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder['then'] = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  };
  return { client, calls };
}

const thread = (status: InboxThread['status']): InboxThread => ({
  id: 't1',
  name: 'Ana',
  email: 'ana@mail.com',
  subject: '',
  lang: 'es',
  status,
  syncError: null,
  createdAt: '2026-10-25T00:00:00Z',
  lastMessageAt: '2026-10-25T00:00:00Z',
  preview: '',
});

describe('InboxService', () => {
  function setup(result?: { data: unknown; error: unknown }) {
    const fake = fakeClient(result);
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: fake.client } }] });
    return { service: TestBed.inject(InboxService), calls: fake.calls };
  }

  it('markRead no escribe si el estado no es new', async () => {
    const { service, calls } = setup();
    await firstValueFrom(service.markRead(thread('replied')));
    expect(calls.length).toBe(0);
  });

  it('markRead actualiza a read si es new', async () => {
    const { service, calls } = setup({ data: null, error: null });
    await firstValueFrom(service.markRead(thread('new')));
    expect(calls).toContain(jasmine.objectContaining({ method: 'from', args: ['contact_threads'] }));
    expect(calls).toContain(jasmine.objectContaining({ method: 'update', args: [{ status: 'read' }] }));
    expect(calls).toContain(jasmine.objectContaining({ method: 'eq', args: ['id', 't1'] }));
  });

  it("listThreads('all') no filtra por estado y listThreads('new') sí", async () => {
    const all = setup();
    await firstValueFrom(all.service.listThreads('all'));
    expect(all.calls.some((call) => call.method === 'eq' && call.args[0] === 'status')).toBeFalse();

    TestBed.resetTestingModule();
    const onlyNew = setup();
    await firstValueFrom(onlyNew.service.listThreads('new'));
    expect(onlyNew.calls).toContain(jasmine.objectContaining({ method: 'eq', args: ['status', 'new'] }));
  });

  it('listThreads arma el extracto con el último mensaje recortado a 140 caracteres', async () => {
    const long = 'x'.repeat(200);
    const { service } = setup({
      data: [
        {
          id: 't1', name: 'Ana', email: 'ana@mail.com', subject: '', lang: 'es', status: 'new', sync_error: null,
          created_at: '2026-10-25T00:00:00Z', last_message_at: '2026-10-25T02:00:00Z',
          contact_messages: [
            { body: 'viejo', created_at: '2026-10-25T00:00:00Z' },
            { body: long, created_at: '2026-10-25T02:00:00Z' },
          ],
        },
      ],
      error: null,
    });
    const [first] = await firstValueFrom(service.listThreads('all'));
    expect(first.preview).toBe('x'.repeat(140));
    expect(first.lastMessageAt).toBe('2026-10-25T02:00:00Z');
  });
});
