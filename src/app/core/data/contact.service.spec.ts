import { TestBed } from '@angular/core/testing';
import { ContactService, ContactSubmitInput } from './contact.service';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

describe('ContactService', () => {
  const input: ContactSubmitInput = {
    name: 'Ana',
    email: 'ana@mail.com',
    topic: 'project',
    message: 'Quiero una landing con 3D.',
    lang: 'es',
    website: '',
  };
  let rpc: jasmine.Spy;
  let fetchSpy: jasmine.Spy;
  let service: ContactService;
  const originalKey = environment.web3formsKey;

  beforeEach(() => {
    rpc = jasmine.createSpy('rpc');
    fetchSpy = spyOn(window, 'fetch');
    (environment as { web3formsKey: string }).web3formsKey = 'test-key';
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }] });
    service = TestBed.inject(ContactService);
  });

  afterEach(() => ((environment as { web3formsKey: string }).web3formsKey = originalKey));

  const ok = () => Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));

  it('guarda en Supabase y envía a Web3Forms', async () => {
    rpc.and.resolveTo({ data: 'received', error: null });
    fetchSpy.and.callFake(ok);
    expect(await service.submit(input)).toBe('received');
    expect(rpc).toHaveBeenCalledWith('submit_contact', { p_name: 'Ana', p_email: 'ana@mail.com', p_topic: 'project', p_message: input.message, p_lang: 'es' });
    const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
    expect(body).toEqual(jasmine.objectContaining({ access_key: 'test-key', name: 'Ana', email: 'ana@mail.com', message: input.message }));
  });

  it('si se alcanza el límite no envía a Web3Forms', async () => {
    rpc.and.resolveTo({ data: 'rate_limited', error: null });
    expect(await service.submit(input)).toBe('rate_limited');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('basta con que funcione Web3Forms si Supabase falla', async () => {
    rpc.and.resolveTo({ data: null, error: { message: 'down' } });
    fetchSpy.and.callFake(ok);
    expect(await service.submit(input)).toBe('received');
  });

  it('basta con que funcione Supabase si Web3Forms falla', async () => {
    rpc.and.resolveTo({ data: 'received', error: null });
    fetchSpy.and.rejectWith(new TypeError('network'));
    expect(await service.submit(input)).toBe('received');
  });

  it('error solo si fallan los dos', async () => {
    rpc.and.resolveTo({ data: null, error: { message: 'down' } });
    fetchSpy.and.resolveTo(new Response(JSON.stringify({ success: false }), { status: 500 }));
    expect(await service.submit(input)).toBe('error');
  });

  it('el honeypot finge éxito sin llamar a nada', async () => {
    expect(await service.submit({ ...input, website: 'x' })).toBe('received');
    expect(rpc).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
