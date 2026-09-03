// Czysta logika panelu admina — ZERO importów Deno/Supabase, żeby dało się ją
// testować vitestem z repo (supabase/functions/**/logic.test.ts łapie domyślny
// glob). index.ts wstrzykuje realne zależności (timing-safe compare, admin API).

export const ALLOWED_ROLES = ['Rekruter', 'Team Leader', 'Administrator', 'Rekruter SA'] as const;

export interface EmployeeRow {
  name: string;
  email: string;
  employee_id: number | null;
  role: string;
  team: string;
  active: boolean;
}

export interface AuthUserRow {
  id: string;
  email: string;
}

export interface AdminDeps {
  /** Timing-safe porównanie z ADMIN_PANEL_PASSWORD (implementacja w index.ts). */
  passwordMatches(provided: string): boolean;
  /** Append-only wpis do admin_login_attempts + opóźnienie odpowiedzi 401. */
  logFailedAttempt(): Promise<void>;
  listEmployees(): Promise<EmployeeRow[]>;
  listAuthUsers(): Promise<AuthUserRow[]>;
  createAuthUser(email: string, password: string, fullName: string): Promise<void>;
  setAuthUserPassword(userId: string, password: string): Promise<void>;
  upsertEmployee(row: EmployeeRow): Promise<void>;
  /** banned=true → ban konta (offboarding), false → zdjęcie bana. */
  setAuthUserBanned(userId: string, banned: boolean): Promise<void>;
}

export interface AdminResponse {
  status: number;
  body: Record<string, unknown>;
}

interface Payload {
  action?: string;
  email?: string;
  password?: string;
  name?: string;
  employeeId?: number | null;
  role?: string;
  team?: string;
  active?: boolean;
}

const bad = (message: string): AdminResponse => ({ status: 400, body: { error: message } });

function findAuthUser(users: AuthUserRow[], email: string): AuthUserRow | undefined {
  const lower = email.toLowerCase();
  return users.find(u => u.email.toLowerCase() === lower);
}

function validateEmployeeFields(p: Payload): string | null {
  if (!p.email?.trim()) return 'Brak adresu email';
  if (!p.name?.trim()) return 'Brak imienia i nazwiska';
  if (!p.role || !(ALLOWED_ROLES as readonly string[]).includes(p.role)) {
    return `Nieprawidłowa rola (dozwolone: ${ALLOWED_ROLES.join(', ')})`;
  }
  return null;
}

export async function handleAdminRequest(
  providedPassword: string | null,
  payload: Payload,
  deps: AdminDeps
): Promise<AdminResponse> {
  if (!providedPassword || !deps.passwordMatches(providedPassword)) {
    await deps.logFailedAttempt();
    return { status: 401, body: { error: 'Nieprawidłowe hasło administratora' } };
  }

  switch (payload.action) {
    case 'list_users': {
      const [employees, authUsers] = await Promise.all([deps.listEmployees(), deps.listAuthUsers()]);
      const users = employees.map(e => ({
        name: e.name,
        email: e.email,
        employeeId: e.employee_id,
        role: e.role,
        team: e.team,
        active: e.active,
        hasAccount: !!findAuthUser(authUsers, e.email),
      }));
      return { status: 200, body: { users } };
    }

    case 'create_user': {
      const fieldError = validateEmployeeFields(payload);
      if (fieldError) return bad(fieldError);
      if (!payload.password || payload.password.length < 8) {
        return bad('Hasło musi mieć co najmniej 8 znaków');
      }
      const existing = findAuthUser(await deps.listAuthUsers(), payload.email!);
      if (existing) return bad('Konto z tym adresem email już istnieje');
      await deps.createAuthUser(payload.email!.trim(), payload.password, payload.name!.trim());
      await deps.upsertEmployee({
        name: payload.name!.trim(),
        email: payload.email!.trim(),
        employee_id: payload.employeeId ?? null,
        role: payload.role!,
        team: payload.team?.trim() || 'Nieprzypisany',
        active: true,
      });
      return { status: 200, body: { ok: true } };
    }

    case 'reset_password': {
      if (!payload.email?.trim()) return bad('Brak adresu email');
      if (!payload.password || payload.password.length < 8) {
        return bad('Hasło musi mieć co najmniej 8 znaków');
      }
      const authUser = findAuthUser(await deps.listAuthUsers(), payload.email);
      if (!authUser) return bad('Brak konta o tym adresie email');
      await deps.setAuthUserPassword(authUser.id, payload.password);
      return { status: 200, body: { ok: true } };
    }

    case 'upsert_employee': {
      const fieldError = validateEmployeeFields(payload);
      if (fieldError) return bad(fieldError);
      const active = payload.active !== false;
      await deps.upsertEmployee({
        name: payload.name!.trim(),
        email: payload.email!.trim(),
        employee_id: payload.employeeId ?? null,
        role: payload.role!,
        team: payload.team?.trim() || 'Nieprzypisany',
        active,
      });
      // Deaktywacja MUSI banować konto auth: samo active=false zostawiłoby
      // działający login, a zdeaktywowanemu 'Rekruter SA' wręcz POSZERZYŁOBY
      // widok (isSaRecruiter → false przy filtrze WHERE active → pełna lista
      // tasków zamiast filtrowanej SA).
      const authUser = findAuthUser(await deps.listAuthUsers(), payload.email!);
      if (authUser) await deps.setAuthUserBanned(authUser.id, !active);
      return { status: 200, body: { ok: true } };
    }

    default:
      return bad(`Nieznana akcja: ${payload.action ?? '(brak)'}`);
  }
}
