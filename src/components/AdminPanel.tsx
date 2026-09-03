import React, { useState } from 'react';
import { Lock, RefreshCw, UserPlus, Save, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ALLOWED_ROLES } from '../../supabase/functions/admin-users/logic';

// Panel wewnętrzny dla admina — celowo tylko PL, bez translations.ts.
// Hasło żyje wyłącznie w pamięci (useState): F5 = ponowne wpisanie, za to nie
// leży w żadnym storage. Realna autoryzacja jest server-side (Edge Function).

interface AdminUser {
  name: string;
  email: string;
  employeeId: number | null;
  role: string;
  team: string;
  active: boolean;
  hasAccount: boolean;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

const emptyForm = { name: '', email: '', employeeId: '', role: 'Rekruter', team: '', password: '' };

export const AdminPanel: React.FC = () => {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminUser | null>(null);

  const callAdmin = async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setAuthed(false);
      throw new Error('Nieprawidłowe hasło administratora');
    }
    if (!response.ok) {
      throw new Error(typeof body.error === 'string' ? body.error : `Błąd ${response.status}`);
    }
    return body;
  };

  const refreshUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await callAdmin({ action: 'list_users' });
      setUsers(body.users as AdminUser[]);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleCreate = () =>
    run(async () => {
      await callAdmin({
        action: 'create_user',
        name: form.name,
        email: form.email,
        employeeId: form.employeeId === '' ? null : Number(form.employeeId),
        role: form.role,
        team: form.team,
        password: form.password,
      });
      setNotice(`Utworzono konto ${form.email}. Hasło tymczasowe: ${form.password} — przekaż je i poproś o zmianę w Ustawieniach konta.`);
      setForm(emptyForm);
      setShowForm(false);
    });

  const handleReset = (user: AdminUser) => {
    if (!window.confirm(`Zresetować hasło dla ${user.email}?`)) return;
    const newPassword = generatePassword();
    run(async () => {
      await callAdmin({ action: 'reset_password', email: user.email, password: newPassword });
      setNotice(`Nowe hasło dla ${user.email}: ${newPassword} — przekaż je i poproś o zmianę w Ustawieniach konta.`);
    });
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    run(async () => {
      await callAdmin({
        action: 'upsert_employee',
        name: draft.name,
        email: draft.email,
        employeeId: draft.employeeId,
        role: draft.role,
        team: draft.team,
        active: draft.active,
      });
      setEditingEmail(null);
      setDraft(null);
    });
  };

  const startEdit = (user: AdminUser) => {
    setEditingEmail(user.email);
    setDraft({ ...user });
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form
          onSubmit={e => { e.preventDefault(); refreshUsers(); }}
          className="bg-white rounded-lg shadow p-6 w-full max-w-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-gray-800">
            <Lock className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Panel administratora Sunshine</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Hasło administratora"
            className="w-full border rounded px-3 py-2"
            autoFocus
            data-testid="admin-password-input"
          />
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1" data-testid="admin-error">
              <AlertCircle className="w-4 h-4" />{error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
            data-testid="admin-login-button"
          >
            {loading ? 'Sprawdzanie…' : 'Wejdź'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Panel administratora Sunshine</h1>
          <div className="flex gap-2">
            <button
              onClick={refreshUsers}
              disabled={loading}
              className="flex items-center gap-1 border rounded px-3 py-2 bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Odśwież
            </button>
            <button
              onClick={() => { setShowForm(v => !v); setForm({ ...emptyForm, password: generatePassword() }); }}
              className="flex items-center gap-1 bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700"
              data-testid="admin-new-user-button"
            >
              <UserPlus className="w-4 h-4" />Nowy użytkownik
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 flex items-center gap-1" data-testid="admin-error">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3 flex items-center gap-1 break-all" data-testid="admin-notice">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{notice}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={e => { e.preventDefault(); handleCreate(); }}
            className="bg-white rounded-lg shadow p-4 grid grid-cols-2 gap-3"
            data-testid="admin-create-form"
          >
            <input required placeholder="Imię i nazwisko" className="border rounded px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required type="email" placeholder="Email" className="border rounded px-3 py-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="number" placeholder="Employee ID (z portalu Mamamia)" className="border rounded px-3 py-2" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} />
            <select className="border rounded px-3 py-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ALLOWED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input placeholder="Team (domyślnie: Nieprzypisany)" className="border rounded px-3 py-2" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} />
            <div className="flex gap-2">
              <input required minLength={8} placeholder="Hasło tymczasowe" className="border rounded px-3 py-2 flex-1 font-mono" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })} className="border rounded px-3 py-2 bg-white hover:bg-gray-100">Wygeneruj</button>
            </div>
            <button type="submit" disabled={loading} className="col-span-2 bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
              Utwórz konto i powiąż z rekruterem
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-users-table">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Imię i nazwisko</th>
                <th className="p-3">Email</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Rola</th>
                <th className="p-3">Team</th>
                <th className="p-3">Aktywny</th>
                <th className="p-3">Konto</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isEditing = editingEmail === user.email && draft;
                return (
                  <tr key={user.email} className={`border-b last:border-0 ${user.active ? '' : 'opacity-50'}`}>
                    <td className="p-3">
                      {isEditing
                        ? <input className="border rounded px-2 py-1 w-full" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                        : user.name}
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      {isEditing
                        ? <input type="number" className="border rounded px-2 py-1 w-24" value={draft.employeeId ?? ''} onChange={e => setDraft({ ...draft, employeeId: e.target.value === '' ? null : Number(e.target.value) })} />
                        : user.employeeId ?? '—'}
                    </td>
                    <td className="p-3">
                      {isEditing
                        ? <select className="border rounded px-2 py-1" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>
                            {ALLOWED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        : user.role}
                    </td>
                    <td className="p-3">
                      {isEditing
                        ? <input className="border rounded px-2 py-1 w-28" value={draft.team} onChange={e => setDraft({ ...draft, team: e.target.value })} />
                        : user.team}
                    </td>
                    <td className="p-3">
                      {isEditing
                        ? <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} title="Deaktywacja banuje też konto (login przestaje działać)" />
                        : (user.active ? 'tak' : 'nie')}
                    </td>
                    <td className="p-3">{user.hasAccount ? 'jest' : 'brak'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {isEditing ? (
                        <span className="flex gap-2">
                          <button onClick={handleSaveDraft} disabled={loading} className="flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50"><Save className="w-4 h-4" />Zapisz</button>
                          <button onClick={() => { setEditingEmail(null); setDraft(null); }} className="text-gray-500 hover:underline">Anuluj</button>
                        </span>
                      ) : (
                        <span className="flex gap-3">
                          <button onClick={() => startEdit(user)} className="text-blue-600 hover:underline">Edytuj</button>
                          {user.hasAccount ? (
                            <button onClick={() => handleReset(user)} disabled={loading} className="flex items-center gap-1 text-amber-600 hover:underline disabled:opacity-50"><KeyRound className="w-4 h-4" />Reset hasła</button>
                          ) : (
                            <button
                              onClick={() => { setShowForm(true); setForm({ name: user.name, email: user.email, employeeId: user.employeeId?.toString() ?? '', role: user.role, team: user.team, password: generatePassword() }); }}
                              className="text-green-700 hover:underline"
                            >Utwórz konto</button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
