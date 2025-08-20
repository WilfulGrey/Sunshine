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
- **Testy**: 123/124 unit tests ✅ 
- **Deploy**: Render.com skonfigurowany
- **Funkcjonalności**: Task filtering, urgent boost, UI stability

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

## Następne Sesje
- Monitoring działania wklejka functionality w produkcji
- Ewentualne ulepszenia UX (bulk operations, lepsze wizualne wskazówki)
- Nowe feature requests  
- Bug fixes
- Performance improvements

---
*Ostatnia aktualizacja: 2025-08-20 - Wklejka functionality complete*