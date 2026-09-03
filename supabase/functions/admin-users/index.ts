// Edge Function panelu admina. verify_jwt=false (supabase/config.toml) —
// autoryzacja własna: nagłówek x-admin-password vs sekret ADMIN_PANEL_PASSWORD.
// Service role key jest w env funkcji automatycznie; NIGDY nie trafia do klienta.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleAdminRequest, type AdminDeps, type EmployeeRow } from './logic.ts';

const ADMIN_PASSWORD = Deno.env.get('ADMIN_PANEL_PASSWORD') ?? '';

const ALLOWED_ORIGINS = [
  'https://sunshine.beta.mamamia.app',
  'https://sunshine-tasks.onrender.com',
  'https://sunshine-tasks-staging.onrender.com',
  'http://localhost:5173',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type, x-admin-password',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Porównanie stałoczasowe po maksymalnej długości — różnica długości też nie skraca pętli
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i % ab.length] ?? 0) ^ (bb[i % bb.length] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }
  if (!ADMIN_PASSWORD) {
    // Sekret nieustawiony = twarda odmowa, nie „otwarte drzwi"
    return new Response(JSON.stringify({ error: 'ADMIN_PANEL_PASSWORD nie jest skonfigurowane' }), { status: 500, headers });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const deps: AdminDeps = {
    passwordMatches: (provided) => timingSafeEqual(provided, ADMIN_PASSWORD),
    logFailedAttempt: async () => {
      await supabase.from('admin_login_attempts').insert({
        ip: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      });
      // sleep(1s) przed 401 — hasło jest generowane (32+), lockout to byłby
      // wektor DoS na admina; wartością jest log + spowolnienie, nie blokada.
      await new Promise((r) => setTimeout(r, 1000));
    },
    listEmployees: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('name, email, employee_id, role, team, active')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as EmployeeRow[];
    },
    listAuthUsers: async () => {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw new Error(error.message);
      return data.users.map((u) => ({ id: u.id, email: u.email ?? '' }));
    },
    createAuthUser: async (email, password, fullName) => {
      const { error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw new Error(error.message);
    },
    setAuthUserPassword: async (userId, password) => {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error(error.message);
    },
    upsertEmployee: async (row) => {
      const { error } = await supabase.from('employees').upsert(row, { onConflict: 'email' });
      if (error) throw new Error(error.message);
    },
    setAuthUserBanned: async (userId, banned) => {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: banned ? '876000h' : 'none',
      });
      if (error) throw new Error(error.message);
    },
  };

  try {
    const payload = await req.json().catch(() => ({}));
    const result = await handleAdminRequest(req.headers.get('x-admin-password'), payload, deps);
    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
});
