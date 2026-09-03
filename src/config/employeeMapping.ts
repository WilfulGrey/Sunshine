import { supabase } from '../lib/supabase';

export interface Employee {
  name: string;
  email: string;
  employeeId: number | null;
  role: string;
  team: string;
}

// Cache z tabeli employees (Supabase). Zapełniany przez loadEmployees() po
// zalogowaniu (RLS: SELECT tylko dla authenticated). Gettery niżej pozostają
// synchroniczne — call sites bez zmian względem czasów zahardkodowanej tablicy.
let EMPLOYEES: Employee[] = [];
let loadedForUserId: string | null = null;

const emailToIdMap = new Map<string, number>();
const idToEmployeeMap = new Map<number, Employee>();
const nameToEmployeeMap = new Map<string, Employee>();

function rebuildMaps(): void {
  emailToIdMap.clear();
  idToEmployeeMap.clear();
  nameToEmployeeMap.clear();
  for (const emp of EMPLOYEES) {
    nameToEmployeeMap.set(emp.name.toLowerCase(), emp);
    if (emp.employeeId !== null) {
      emailToIdMap.set(emp.email.toLowerCase(), emp.employeeId);
      idToEmployeeMap.set(emp.employeeId, emp);
    }
  }
}

/**
 * Ładuje aktywnych pracowników z Supabase do cache'a modułu.
 * Cache per zalogowany user — ponowne wywołanie dla tego samego usera jest no-opem,
 * zmiana usera wymusza świeży fetch (bez przecieku stanu między kontami).
 * Pusty wynik = twardy błąd: RLS dla niezalogowanych zwraca 0 wierszy BEZ błędu
 * i nie wolno tego uznać za sukces (cichy fallback do pustego mapowania).
 */
export async function loadEmployees(userId: string): Promise<void> {
  if (loadedForUserId === userId && EMPLOYEES.length > 0) return;

  const { data, error } = await supabase
    .from('employees')
    .select('name, email, employee_id, role, team')
    .eq('active', true)
    .order('name');

  if (error) {
    throw new Error(`Nie udało się załadować listy pracowników: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error('Lista pracowników jest pusta — brak dostępu do tabeli employees albo brak aktywnych pracowników.');
  }

  EMPLOYEES = data.map(row => ({
    name: row.name,
    email: row.email,
    employeeId: row.employee_id,
    role: row.role,
    team: row.team,
  }));
  loadedForUserId = userId;
  rebuildMaps();
}

export function getEmployeeId(email: string): number | null {
  return emailToIdMap.get(email.toLowerCase()) ?? null;
}

export function getEmployeeName(employeeId: number): string | null {
  return idToEmployeeMap.get(employeeId)?.name ?? null;
}

export function getEmployeeByEmail(email: string): Employee | null {
  const id = getEmployeeId(email);
  if (id === null) return null;
  return idToEmployeeMap.get(id) ?? null;
}

export function getAllEmployees(): Employee[] {
  return EMPLOYEES.filter(e => e.employeeId !== null);
}

export function findEmployeeByName(name: string): Employee | null {
  return nameToEmployeeMap.get(name.toLowerCase()) ?? null;
}

// SA recruiters see only foreign-SA applications + their own assigned caregivers.
export function isSaRecruiter(email: string | undefined | null): boolean {
  return !!email && getEmployeeByEmail(email)?.role === 'Rekruter SA';
}
