# Plan: Rola „Rekruter SA” dla Adriany + ukrycie nieprzypisanych aplikacji non-Vitanas

## Context

Rekruterzy widzą nieprzypisane callbacki z całej firmy (potwierdzone: CG 31659 był 5 dni bez rekrutera i pokazywał się wszystkim). Tymczasowe rozwiązanie: wydzielić pulę aplikacji z agencji innych niż **SA Vitanas (id=1)** i skierować ją wyłącznie do Adriany Lekawskiej, która dostaje osobną rolę.

**Ustalenia (z pytań):**
- „aplikacje” = callbacki typu **`interest`** (nie wszystkie typy)
- non-Vitanas `interest` **przypisany** do rekrutera X → X **dalej go widzi** (nie zabieramy w trakcie pracy)
- Adriana widzi **tylko**: non-Vitanas `interest` **nieprzypisane** + callbacki (dowolnego typu) opiekunek **przypisanych do niej**

## Źródło SA: pole `service_agency_id` (już w API)

`/callbacks` zwraca teraz `service_agency_id`. Rozkład (1712 wierszy):
`1`=Vitanas (994), `null` (647), `3`(31), `4`(33), `16`(4), `17`(3).
(Jest też `caregiver_agency_id` = SA **opiekunki** — u nas wszędzie `1`, więc nie różnicuje. Filtrujemy po `service_agency_id` = SA **zlecenia**, potwierdzone: `1` = SA Vitanas.)

**Traktowanie `null` → jak Vitanas (nie-obce).** Uzasadnienie danymi: 372 nieprzypisanych `null` to wyłącznie `general`/`manual` (0 interest). Gdyby `null` liczyć jako obce, zniknęłyby wszystkim rekruterom (a do Adriany i tak by nie trafiły, bo nie-interest). Więc obce = **tylko jawne `3/4/16/17`**.

Stan teraz: obce (71) są **wszystkie przypisane** → nieprzypisanych obcych interest jest **0**. Mechanizm gotowy na przyszłe leady, natychmiastowy efekt zerowy (bezpieczne wdrożenie).

## Zmiany

### 1. Rola (`src/config/employeeMapping.ts`)
- Adriana (`adriana.lekawska@vitanas.pl`, id 32459): `role: 'Rekruter'` → **`'Rekruter SA'`**
- Nowy helper obok istniejących (`getEmployeeId`, `getEmployeeByEmail`):
  ```ts
  export function isSaRecruiter(email: string | undefined | null): boolean {
    return !!email && getEmployeeByEmail(email)?.role === 'Rekruter SA';
  }
  ```

### 2. Przeniesienie `service_agency_id` przez pipeline
- `src/services/sunshineService.ts` — `SunshineCallback`: +`service_agency_id?: number | null`
- `src/types/Task.ts` — `apiData`: +`serviceAgencyId?: number | null`
- `src/utils/sunshineHelpers.ts` (`convertCallbackToTask`): +`serviceAgencyId: callback.service_agency_id`

### 3. Bramka widoczności (`src/utils/taskUtils.ts` — `filterActiveTasks`)

Nowy **opcjonalny** 4. parametr `isSaRecruiter = false` (default zachowuje obecne zachowanie → wszystkie istniejące testy przechodzą bez zmian).

```ts
const VITANAS_SA_ID = 1;
// ponytail: null/brak → Vitanas (nie-obce). Tylko jawne 3/4/16/17 są "obce".
const saId = task.apiData?.serviceAgencyId ?? VITANAS_SA_ID;
const isForeignApplication =
  saId !== VITANAS_SA_ID && task.apiData?.callbackType === 'interest' && !task.apiData?.employeeId;
```

- **Adriana** (`isSaRecruiter`): widzi **wyłącznie** `isMine || isForeignApplication`, reszta `false`.
- **Pozostali**: `isForeignApplication` → `false` (to pula Adriany); dalej bez zmian — hard guard „przypisane do kogoś innego”, `takenTasks`, nieprzypisane, moje.

Kolejność: hard guard employee_id zostaje pierwszy dla nie-Adriany (nie ruszamy fixu z `3fdd7f6`).

### 4. Przepięcie wywołania
- `getProcessedTasks(...)` — +5. opcjonalny param `isSaRecruiter = false`, przekazywany do `filterActiveTasks`
- `src/components/TaskFocusedView.tsx:308` — jedyny produkcyjny caller; przekazuje `isSaRecruiter(user?.email)` (`user` już dostępny z `useAuth`)

## Pliki

| Plik | Zmiana |
|---|---|
| `src/config/employeeMapping.ts` | rola Adriany + helper `isSaRecruiter` |
| `src/services/sunshineService.ts` | `+service_agency_id?` w `SunshineCallback` |
| `src/types/Task.ts` | `+serviceAgencyId?` w `apiData` |
| `src/utils/sunshineHelpers.ts` | propagacja `service_agency_id` → `serviceAgencyId` |
| `src/utils/taskUtils.ts` | logika SA w `filterActiveTasks` + param w `getProcessedTasks` |
| `src/components/TaskFocusedView.tsx` | przekazanie flagi (1 linia) |
| `src/utils/taskUtils.test.ts` | nowe testy |

Kopia planu trafi do `docs/SA_ROLE_PLAN.md` przy implementacji.

## Testy (`src/utils/taskUtils.test.ts`)

Nowy `describe('filterActiveTasks — SA role')`:
1. non-Vitanas interest nieprzypisany → **ukryty** dla zwykłego rekrutera
2. non-Vitanas interest nieprzypisany → **widoczny** dla Adriany
3. non-Vitanas interest **przypisany do X** → widoczny dla X, **niewidoczny** dla Adriany
4. Vitanas (sa_id=1) interest nieprzypisany → widoczny dla zwykłego (bez zmian)
5. non-Vitanas **general** (nie interest) nieprzypisany → widoczny dla zwykłego, **niewidoczny** dla Adriany
6. callback przypisany do Adriany (dowolne SA/typ) → widoczny dla niej
7. **`serviceAgencyId === null`** → zachowanie jak dziś (nie-obce, widoczne dla zwykłych; Adriana go nie widzi jeśli nie jej)

## Weryfikacja

1. `npm run build` + `npm run test` — 276 istniejących musi przejść bez modyfikacji (dzięki domyślnym parametrom) + ~7 nowych
2. Curl kontrolny: `service_agency_id ∉ {1, null}` + `type=interest` + `employee_id=null` — tyle powinna zobaczyć Adriana z puli obcych (dziś 0)
3. Manualnie: konto Adriany widzi tylko tę pulę + swoje; konto innego rekrutera nie widzi tej puli
