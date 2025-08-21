# Claude Memory - Sunshine Project

## Project Overview
**Sunshine** - React TypeScript aplikacja do zarządzania zadaniami z integracjami:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (baza danych + auth)
- **Integracje**: Airtable, Twilio (głosowe powiadomienia)
- **Testy**: Vitest + Testing Library

## Struktura Projektu
```
src/
├── components/          # Komponenty UI
│   ├── Auth/           # Autoryzacja
│   ├── dialogs/        # Dialogi/modalne
│   └── TaskCard.tsx, TaskList.tsx, etc.
├── contexts/           # React Context (Auth, Language, Timezone)
├── hooks/              # Custom hooks
├── services/           # API services (Airtable, Twilio)
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## Ostatnie Zmiany (z git log)
- **baa3572**: Smart task filtering z ukrywaniem przyszłych zadań
- **4907165**: Rozszerzenie urgent boost na wszystkie zadania
- **aec51c2**: Naprawienie crashów UI i testów
- **c1051e1**: Konfiguracja deployu na Render

## Komendy
```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Testy (Vitest)
npm run test:run     # Testy jednorazowo
npm run test:coverage # Testy z coverage
```

## Ostatnie Prace (Analiza Git)

### Smart Task Filtering (commit baa3572)
✅ **Zaimplementowano**: 
- Ukrywanie zadań z datami kontaktu >7 dni w przyszłość
- Button "Pokaż X starszych zadań" z dynamicznym licznikiem  
- Nigdy nie ukrywaj urgent tasks z Airtable
- Spójne liczenie urgent tasks między Header a TaskList
- Toggle między widokami filtered/full

**Pliki**: Header.tsx, TaskFocusedView.tsx, taskUtils.ts/test

### Urgent Boost dla Wszystkich (commit 4907165) 
✅ **Zaimplementowano**:
- Przycisk AlertTriangle boost dla WSZYSTKICH zadań (nie tylko urgent)
- Auto-ustawianie zadania jako in_progress przy boost
- Reset active task przy boost nowego
- Tooltip: "Przenieś zadanie na pierwszą pozycję"

**Pliki**: TaskFocusedView.tsx, useTaskActions.ts/test

### UI Fixes & Tests (commit aec51c2)
✅ **Naprawiono**:
- Brakujący import XCircle (crash przy start task)
- Pełne action buttons dla in-progress tasks
- 123 testy jednostkowe przechodzą ✅
- Mocki i async handling w testach

**Pliki**: TaskFocusedView.tsx, dialogi, useTaskActions.ts

## Status Techniczny
- **Testy**: 151 unit tests ✅ (po naprawie users table bug)
- **Deploy**: Render.com skonfigurowany
- **Funkcjonalności**: Task filtering, urgent boost, UI stability, task assignment

### Wklejka Functionality (Nowy Feature - 2025-08-20)
✅ **Zaimplementowano kompletną funkcjonalność "wklejka" (URL paste)**:

**Funkcje**:
- Dodawanie/edycja URL-i do zadań (inline editing w TaskFocusedView)
- Automatyczne zapisywanie daty dodania wklejki
- Wizualna sygnalizacja wieku wklejki (>24h = czerwony + ⚠️)
- Usuwanie nieudanych wklejek z licznikiem "Ile nieudanych wklejek"
- Integracja z istniejącymi external linkami

**Zmiany w kodzie**:
- `AirtableContact` interface: dodano pola 'Wklejka', 'Data wklejki', 'Ile nieudanych wklejek'
- `Task` interface: dodano `wklejkaUrl`, `wklejkaDate`, `nieudaneWklejki` w airtableData
- `airtableHelpers.ts`: mapowanie danych z Airtable
- `TaskFocusedView.tsx`: kompletny UI z inline editing, age detection, removal
- **18 nowych testów** dla pełnego pokrycia funkcjonalności

**Testy**: 142 testy (18 nowych wklejka + 124 istniejących) ✅
- Testowanie wyświetlania i linków
- Testowanie wizualnych wskaźników wieku (>24h)
- Testowanie funkcji edycji (save/cancel, Enter/Escape)
- Testowanie usuwania z licznikiem nieudanych prób
- Testowanie integracji z istniejącymi funkcjami

**Pliki**: TaskFocusedView.tsx, airtableService.ts, airtableHelpers.ts, types/Task.ts, TaskFocusedView.wklejka.test.tsx

**Deployment**: 
- ✅ Commit: 69e4953 "Implement complete wklejka (URL paste) functionality"
- ✅ Merged do master i pushed na GitHub origin
- ✅ Render auto-deploy uruchomiony z najnowszymi zmianami

## Git & Deploy Workflow
**WAŻNE**: Zawsze po merge do master wykonuj:
```bash
git push origin master  # Wypchnij na GitHub dla Render
```
- Render automatycznie deployuje z GitHub master branch
- Bez push do origin, zmiany pozostają tylko lokalnie
- Sprawdzaj status: `git status` pokazuje "ahead of origin/master"

### Users Table Assignment Bug Fix (2025-08-21)
✅ **Naprawiono krytyczny bug z przypisywaniem zadań**:

**Problem**: "Dominika Grabowska" nie mogła przypisać zadań do siebie przez przycisk "biorę"

**Root cause**: 
- Błąd pisowni w Airtable: "Grabowaska" vs "Grabowska"
- System pobierał użytkowników z rekordów zamiast z konfiguracji multiselect
- Brak UI feedback przy weryfikacji przypisania

**Rozwiązanie**:
- Airtable Meta API dla pobierania opcji multiselect
- Fuzzy string matching (Levenshtein distance) dla tolerancji błędów pisowni
- UI states: verifying/failed/success z wizualnym feedback
- Zabezpieczenie przed konfliktami przypisań
- 9 nowych testów dla edge cases

**Pliki**: useTaskActions.ts, useAirtable.ts, airtableService.ts, TaskFocusedView.tsx, useTaskActions.test.tsx

**Deployment**: 
- ✅ Branch: `bugfix/users-table-write`
- ✅ Commit: "Fix users table assignment bug with comprehensive safeguards"
- ✅ Merged do master, pushed na GitHub origin
- ✅ Render auto-deploy completed

## Szczegółowa Mapa Plików

### 🎯 Core Hooks (src/hooks/)
- **useTaskActions.ts**: Główna logika akcji na zadaniach
  - Task assignment (take/transfer/unassign)
  - Status changes (complete/abandon/postpone)
  - Priority management (boost urgent)
  - Verification states dla UI feedback
  - Phone call handling
- **useAirtable.ts**: Integracja z Airtable
  - Sync zadań z Airtable
  - User mapping z normalizacją Unicode
  - Fuzzy matching dla błędów pisowni
  - Verification logic po updates
- **useUsers.ts**: Zarządzanie użytkownikami
  - Supabase profiles + auth fallback
  - Multiple auth strategies (RPC, direct)
  - Display name resolution

### 🔌 Services (src/services/)
- **airtableService.ts**: Direct Airtable API
  - CRUD operations na kontaktach
  - Meta API schema introspection
  - Multiselect options fetching
  - Environment + localStorage config
- **twilioService.ts**: Twilio integration dla głosowych powiadomień

### 🎨 Components (src/components/)
- **TaskFocusedView.tsx**: Główny widok zadania
  - Action buttons (biorę/telefon/zakończ)
  - Wklejka functionality (inline editing)
  - Verification states UI
  - External links management
- **TaskList.tsx**: Lista zadań z filtrowaniem
- **Header.tsx**: Top bar z licznikami i toggle
- **Auth/**: Komponenty autoryzacji
- **dialogs/**: Modalne dialogi (complete/abandon/transfer)

### 📊 Types & Utils (src/types/, src/utils/)
- **Task.ts**: Główny interface zadania z airtableData
- **airtableHelpers.ts**: Mapowanie danych Airtable ↔ Task
- **taskUtils.ts**: Utility functions (filtering, sorting)
- **helpers.ts**: History entries, date formatting

### 🧪 Tests
- **useTaskActions.test.tsx**: 9 testów dla assignment logic
- **TaskFocusedView.wklejka.test.tsx**: 18 testów wklejka functionality
- **taskUtils.test.ts**: Task filtering i sorting
- Wszystkie pozostałe z pełnym coverage

### ⚙️ Config Files
- **vite.config.ts**: Vite + Vitest setup
- **tailwind.config.js**: Tailwind CSS
- **tsconfig.json**: TypeScript config
- **.env**: Environment variables (Airtable, Supabase keys)

## Następne Sesje
- Monitoring działania users table fix w produkcji
- Monitoring działania wklejka functionality w produkcji
- Ewentualne ulepszenia UX (bulk operations, lepsze wizualne wskazówki)
- Nowe feature requests  
- Bug fixes
- Performance improvements

---
*Ostatnia aktualizacja: 2025-08-21 - Users table assignment bug fix deployed*