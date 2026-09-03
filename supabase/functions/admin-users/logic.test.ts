import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAdminRequest, type AdminDeps } from './logic';

const makeDeps = (overrides: Partial<AdminDeps> = {}): AdminDeps => ({
  passwordMatches: vi.fn((p: string) => p === 'correct-password'),
  logFailedAttempt: vi.fn(async () => {}),
  listEmployees: vi.fn(async () => [
    { name: 'Jan Testowy', email: 'jan@vitanas.pl', employee_id: 100, role: 'Rekruter', team: 'Orły', active: true },
    { name: 'Bez Konta', email: 'bez.konta@vitanas.pl', employee_id: 200, role: 'Rekruter', team: 'Sowy', active: true },
  ]),
  listAuthUsers: vi.fn(async () => [{ id: 'uid-1', email: 'jan@vitanas.pl' }]),
  createAuthUser: vi.fn(async () => {}),
  setAuthUserPassword: vi.fn(async () => {}),
  upsertEmployee: vi.fn(async () => {}),
  setAuthUserBanned: vi.fn(async () => {}),
  ...overrides,
});

describe('admin-users logic', () => {
  let deps: AdminDeps;
  beforeEach(() => {
    deps = makeDeps();
  });

  describe('autoryzacja', () => {
    it('złe hasło → 401 + log próby, akcja nie wykonana', async () => {
      const res = await handleAdminRequest('wrong', { action: 'list_users' }, deps);
      expect(res.status).toBe(401);
      expect(deps.logFailedAttempt).toHaveBeenCalledOnce();
      expect(deps.listEmployees).not.toHaveBeenCalled();
    });

    it('brak hasła → 401 + log próby', async () => {
      const res = await handleAdminRequest(null, { action: 'list_users' }, deps);
      expect(res.status).toBe(401);
      expect(deps.logFailedAttempt).toHaveBeenCalledOnce();
    });

    it('dobre hasło → akcja wykonana, bez logu próby', async () => {
      const res = await handleAdminRequest('correct-password', { action: 'list_users' }, deps);
      expect(res.status).toBe(200);
      expect(deps.logFailedAttempt).not.toHaveBeenCalled();
    });
  });

  describe('routing akcji', () => {
    it('nieznana akcja → 400 (nie fallthrough)', async () => {
      const res = await handleAdminRequest('correct-password', { action: 'drop_database' }, deps);
      expect(res.status).toBe(400);
    });

    it('brak akcji → 400', async () => {
      const res = await handleAdminRequest('correct-password', {}, deps);
      expect(res.status).toBe(400);
    });
  });

  describe('list_users', () => {
    it('zwraca employees z flagą hasAccount z LEFT JOIN po emailu', async () => {
      const res = await handleAdminRequest('correct-password', { action: 'list_users' }, deps);
      expect(res.status).toBe(200);
      const users = res.body.users as Array<{ email: string; hasAccount: boolean }>;
      expect(users).toHaveLength(2);
      expect(users.find(u => u.email === 'jan@vitanas.pl')?.hasAccount).toBe(true);
      expect(users.find(u => u.email === 'bez.konta@vitanas.pl')?.hasAccount).toBe(false);
    });
  });

  describe('create_user', () => {
    const valid = {
      action: 'create_user', name: 'Nowa Osoba', email: 'nowa@vitanas.pl',
      password: 'tajnehaslo123', role: 'Rekruter', team: 'Orły', employeeId: 300,
    };

    it('tworzy konto auth i upsertuje wiersz employees', async () => {
      const res = await handleAdminRequest('correct-password', valid, deps);
      expect(res.status).toBe(200);
      expect(deps.createAuthUser).toHaveBeenCalledWith('nowa@vitanas.pl', 'tajnehaslo123', 'Nowa Osoba');
      expect(deps.upsertEmployee).toHaveBeenCalledWith(expect.objectContaining({
        email: 'nowa@vitanas.pl', employee_id: 300, active: true,
      }));
    });

    it('istniejące konto → 400 bez tworzenia', async () => {
      const res = await handleAdminRequest('correct-password', { ...valid, email: 'jan@vitanas.pl' }, deps);
      expect(res.status).toBe(400);
      expect(deps.createAuthUser).not.toHaveBeenCalled();
    });

    it('za krótkie hasło → 400', async () => {
      const res = await handleAdminRequest('correct-password', { ...valid, password: 'krótkie' }, deps);
      expect(res.status).toBe(400);
      expect(deps.createAuthUser).not.toHaveBeenCalled();
    });

    it('rola spoza listy → 400 (literówka nie może wyłączyć filtra SA)', async () => {
      const res = await handleAdminRequest('correct-password', { ...valid, role: 'rekruter SA' }, deps);
      expect(res.status).toBe(400);
    });
  });

  describe('reset_password', () => {
    it('ustawia nowe hasło istniejącemu kontu', async () => {
      const res = await handleAdminRequest('correct-password', {
        action: 'reset_password', email: 'jan@vitanas.pl', password: 'nowehaslo123',
      }, deps);
      expect(res.status).toBe(200);
      expect(deps.setAuthUserPassword).toHaveBeenCalledWith('uid-1', 'nowehaslo123');
    });

    it('brak konta → 400', async () => {
      const res = await handleAdminRequest('correct-password', {
        action: 'reset_password', email: 'bez.konta@vitanas.pl', password: 'nowehaslo123',
      }, deps);
      expect(res.status).toBe(400);
      expect(deps.setAuthUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('upsert_employee', () => {
    const valid = {
      action: 'upsert_employee', name: 'Jan Testowy', email: 'jan@vitanas.pl',
      role: 'Rekruter', team: 'Orły', employeeId: 100,
    };

    it('deaktywacja banuje konto auth (inaczej login działa, a SA traci filtr)', async () => {
      const res = await handleAdminRequest('correct-password', { ...valid, active: false }, deps);
      expect(res.status).toBe(200);
      expect(deps.upsertEmployee).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
      expect(deps.setAuthUserBanned).toHaveBeenCalledWith('uid-1', true);
    });

    it('reaktywacja zdejmuje bana', async () => {
      await handleAdminRequest('correct-password', { ...valid, active: true }, deps);
      expect(deps.setAuthUserBanned).toHaveBeenCalledWith('uid-1', false);
    });

    it('wiersz bez konta auth → upsert bez banowania', async () => {
      const res = await handleAdminRequest('correct-password', {
        ...valid, email: 'bez.konta@vitanas.pl', name: 'Bez Konta', active: false,
      }, deps);
      expect(res.status).toBe(200);
      expect(deps.setAuthUserBanned).not.toHaveBeenCalled();
    });
  });
});
