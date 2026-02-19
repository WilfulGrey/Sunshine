interface Employee {
  name: string;
  email: string;
  employeeId: number | null;
  role: string;
  team: string;
}

const EMPLOYEES: Employee[] = [
  { name: 'Michał Kępiński', email: 'm.kepinski@mamamia.app', employeeId: 31141, role: 'Administrator', team: 'Nieprzypisany' },
  { name: 'Admin MM', email: 'mm@vitanas.pl', employeeId: 1, role: 'Rekruter', team: 'Nieprzypisany' },
  { name: 'Paulina Janiszewska', email: 'paulina.janiszewska@vitanas.pl', employeeId: 980, role: 'Rekruter', team: 'Rekiny' },
  { name: 'Dominika Michalska', email: 'dominika.michalska@vitanas.pl', employeeId: 1683, role: 'Team Leader', team: 'Rekiny' },
  { name: 'Aneta Górzna', email: 'aneta.gorzna@vitanas.pl', employeeId: 3566, role: 'Team Leader', team: 'Orły' },
  { name: 'Karolina Wilk', email: 'karolina.wilk@vitanas.pl', employeeId: 3567, role: 'Rekruter', team: 'Orły' },
  { name: 'Joanna Trefler', email: 'joanna.trefler@vitanas.pl', employeeId: 3568, role: 'Rekruter', team: 'Orły' },
  { name: 'Patrycja Strzeżek', email: 'patrycja.strzezek@vitanas.pl', employeeId: 3569, role: 'Rekruter', team: 'Orły' },
  { name: 'Sara Hajda-Kowalska', email: 'sara.hajda-kowalska@vitanas.pl', employeeId: 3571, role: 'Team Leader', team: 'Pantery' },
  { name: 'Karolina Wojcieszak', email: 'karolina.wojcieszak@vitanas.pl', employeeId: 3572, role: 'Rekruter', team: 'Pantery' },
  { name: 'Monika Jakubowska', email: 'monika.jakubowska@vitanas.pl', employeeId: 3575, role: 'Rekruter', team: 'Rekiny' },
  { name: 'Patrycja Jędrychowska', email: 'patrycja.jedrychowska@vitanas.pl', employeeId: 27465, role: 'Rekruter', team: 'Pantery' },
  { name: 'Monika Bandyk', email: 'monika.bandyk@vitanas.pl', employeeId: 27533, role: 'Rekruter', team: 'Rekiny' },
  { name: 'Magdalena Sobolewska', email: 'magdalena.sobolewska@vitanas.pl', employeeId: 27890, role: 'Rekruter', team: 'Pantery' },
  { name: 'Małgorzata Luksin', email: 'malgorzata.luksin@vitanas.pl', employeeId: 28004, role: 'Rekruter', team: 'Orły' },
  { name: 'Marta Kapcio', email: 'marta.kapcio@vitanas.pl', employeeId: 28033, role: 'Team Leader', team: 'Sowy' },
  { name: 'Michał Babczyński', email: 'm.babczynski+rekruterProd@mamamia.app', employeeId: 28442, role: 'Administrator', team: 'Nieprzypisany' },
  { name: 'Katarzyna Sadowska', email: 'katarzyna.sadowska@vitanas.pl', employeeId: 30994, role: 'Rekruter', team: 'Rekiny' },
  { name: 'Dominika Grabowska', email: 'd.grabowska@mamamia.app', employeeId: 31140, role: 'Administrator', team: 'Nieprzypisany' },
  { name: 'Alex Nowek', email: 'a.nowek@mamamia.app', employeeId: 31145, role: 'Administrator', team: 'Nieprzypisany' },
  { name: 'Marek Styn', email: 'marek.styn@vitanas.pl', employeeId: 31719, role: 'Rekruter', team: 'Rekiny' },
];

const emailToIdMap = new Map<string, number>();
const idToEmployeeMap = new Map<number, Employee>();

for (const emp of EMPLOYEES) {
  if (emp.employeeId !== null) {
    emailToIdMap.set(emp.email.toLowerCase(), emp.employeeId);
    idToEmployeeMap.set(emp.employeeId, emp);
  }
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
  const lower = name.toLowerCase();
  return EMPLOYEES.find(e => e.name.toLowerCase() === lower) ?? null;
}
