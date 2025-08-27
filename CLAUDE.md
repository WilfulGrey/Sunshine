# Claude Memory - Sunshine Project

## 🚨 CRITICAL DEVELOPMENT RULES (TOP PRIORITY) 

### 🎯 AUTOMATED TESTING IS MANDATORY FOR COMPLEX BUGS (2025-08-25):
```
🔥 WHEN USER SAYS "nadal nie działa, spam na maksa dalej":
□ STOP making random code changes
□ INSTALL proper testing tools (puppeteer, playwright)
□ CREATE automated browser test to see REAL console output
□ IDENTIFY exact error messages and stack traces
□ FIX based on concrete evidence, not guesswork
□ VERIFY fix with same automated test

⚠️ NEVER say "aplikacja działa" without seeing browser console
⚠️ NEVER make dependency array changes without testing
⚠️ NEVER claim "infinite loop fixed" without proof
```

### ❌ NEVER SAY "READY" WITHOUT MANDATORY VERIFICATION:
```
🔴 BEFORE saying "ready/deploy ready/działa":
□ npm run build (MUST pass - zero tolerance for errors)
□ npm run dev (MUST start without errors)  
□ CREATE & RUN automated Puppeteer test (MANDATORY)
□ VERIFY in browser console output - no critical errors
□ Test primary user action (MUST function)

🟡 THEN verification:
□ npm run test (acceptable pass rate)
□ Manual test key functionality  
□ No regression in existing features

🟢 ONLY THEN SAY:
□ "App ready for testing on localhost:XXXX"
```

### 🤖 PUPPETEER TESTING IS MANDATORY FOR ALL BUILDS:
```
🎯 EVERY build session MUST include:
□ Write automated Puppeteer test for the feature
□ Run test and capture console output
□ NEVER claim "działa" without seeing actual browser behavior
□ Screenshot evidence when possible
□ Fix based on test results, not assumptions

⚠️ NO EXCEPTIONS: Manual clicking ≠ automated verification
⚠️ Console logs are REQUIRED evidence
⚠️ User perspective testing with actual browser automation
```

### 🔐 USER CREDENTIALS MUST BE PRESERVED (2025-08-27):
```
🔑 WHEN USER PROVIDES LOGIN CREDENTIALS:
□ ALWAYS use EXACTLY the credentials provided by the user
□ NEVER substitute with fake/test/example credentials
□ PRESERVE login and password as given in conversation
□ ASK user for credentials if not provided, don't guess
□ STORE provided credentials temporarily for test session

⚠️ NEVER create fake credentials like:
   - "test@example.com" / "password123" 
   - "michal@mamamia.com" / "testpass123"
   - Any made-up email/password combinations

✅ ALWAYS use user-provided credentials exactly:
   - Email: exactly as user typed
   - Password: exactly as user typed
   - No modifications, no assumptions
```

### 🔍 CONSOLE LOGS ANALYSIS IS MANDATORY (2025-08-27):
```
🚨 BEFORE making ANY code changes after tests:
□ READ all console output from test carefully
□ IDENTIFY exact errors, exceptions, and stack traces  
□ LOOK FOR missing logs that should be present
□ ANALYZE what the console tells you vs what you expected
□ ONLY THEN make targeted fixes based on console evidence

❌ NEVER assume problems without console evidence
❌ NEVER make random changes hoping they work
❌ NEVER skip reading test output thoroughly
✅ ALWAYS let console logs guide your debugging decisions
✅ ALWAYS compare expected vs actual log patterns
```

### Key Lessons from 2025-08-22 Real-time Implementation Disaster:
- **2x said "deploy ready" when app crashed** - UNACCEPTABLE
- **"89% test pass ≠ working app"** - Tests don't guarantee functionality
- **TypeScript compilation errors = instant app crash** - No exceptions
- **React Context outside Provider = crash** - Architecture must be verified
- **User experience > Technical correctness** - If user can't click → FAIL

### New Mindset: USER-FIRST VERIFICATION
- Every change must be verified from user perspective
- "Does the button work?" > "Does the code compile?"
- Manual verification is MANDATORY, not optional
- Quality over speed, always

---

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
- **Testy**: 169 unit tests ✅ (po naprawie boost functionality)
- **Deploy**: Render.com skonfigurowany
- **Funkcjonalności**: Task filtering, smart boost system, UI stability, task assignment, loading states

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

### Enhanced Boost Functionality (2025-08-21)
✅ **Zaimplementowano zaawansowaną funkcjonalność boost z exclusive behavior**:

**Problem**: Boost functionality miała migotanie UI i nie działała exclusive (mogło być wiele boosted naraz)

**Rozwiązanie**:
- **Exclusive Boost**: Tylko jeden task może być boosted w danym momencie
- **Dwa tryby boost**:
  - 🔺 **AlertTriangle button**: boost → `pending` status (pokazuje "Jetzt starten")
  - 📞 **Phone button**: boost → `in_progress` status (pokazuje "Abschließen")
- **Loading States**: Spinner ikony podczas operacji boost z disabled buttons
- **Async Operations**: Sekwencyjne update'y żeby uniknąć migotania UI
- **Nowy Priority Type**: `'boosted'` oddzielny od `'urgent'`
- **Enhanced Sorting**: Boosted tasks zawsze na pierwszej pozycji
- **Purple Styling**: Fioletowy kolor dla boosted priority

**Zmiany w kodzie**:
- `TaskPriority` type: dodano `'boosted'`
- `useTaskActions.ts`: async boost functions z exclusive logic i loading states
- `TaskFocusedView.tsx`: loading UI z Loader2 spinnerami
- `taskUtils.ts`: zaktualizowane sortowanie i priority colors
- Kompletne testy dla nowej funkcjonalności

**Testy**: 169 testów (wszystkie przechodzą) ✅
- Async boost operations testing
- Exclusive behavior verification
- Loading states UI testing
- Priority sorting validation

**Pliki**: useTaskActions.ts, TaskFocusedView.tsx, taskUtils.ts, Task.ts, wszystkie test files

**Deployment**: 
- ✅ Branch: `bugfix/boost-user-assignment`
- ✅ Commit: "Fix boost functionality with exclusive behavior and loading states"
- ✅ Merged do master, pushed na GitHub origin (769de7a)
- ✅ Render auto-deploy completed

### User Assignment Race Condition Fix (2025-08-22)
✅ **Naprawiono race condition w przypisywaniu zadań**:

**Problem**: Użytkownicy mogli przypisać się do zadań mimo że ktoś inny był już przypisany (stale lokalne dane)

**Rozwiązanie**:
- **Real-time Airtable verification**: `getContactById()` sprawdza aktualny stan przed przypisaniem
- **Race condition protection**: Zapobiega konfliktom gdy lokalne dane są nieaktualne
- **Clear user feedback**: Alert + auto refresh strony przy wykryciu konfliktu
- **Graceful error handling**: Fallback na refresh jeśli Airtable nie odpowiada
- **Test compatibility**: `skipAirtableCheck` parameter dla testów

**Zmiany w kodzie**:
- `airtableService.ts`: dodano `getContactById()` method
- `useTaskActions.ts`: real-time verification w `handleTakeTask()`
- User field type: `string | string[]` dla multiselect support
- Kompletne mocki window.alert i location.reload w testach

**Testy**: 169 testów (wszystkie przechodzą) ✅
- Mock AirtableService z proper return values
- Window methods properly mocked
- skipAirtableCheck flag dla test isolation

**Pliki**: useTaskActions.ts, airtableService.ts, useTaskActions.test.tsx

**Deployment**: 
- ✅ Branch: `bugfix/user-assignment-blocking`
- ✅ Commit: "Fix user assignment blocking by adding Airtable real-time verification" (7aa6352)
- ✅ Merged do master, pushed na GitHub origin
- ✅ Render auto-deploy completed

## Szczegółowa Mapa Plików

### 🎯 Core Hooks (src/hooks/)
- **useTaskActions.ts**: Główna logika akcji na zadaniach
  - Task assignment (take/transfer/unassign)
  - Status changes (complete/abandon/postpone)
  - **Enhanced Boost System**: Exclusive boost z dwoma trybami (pending/in_progress)
  - **Loading States**: boostingTask state dla UI feedback
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
  - **Boost Buttons**: AlertTriangle i Phone z loading spinnerami
  - Wklejka functionality (inline editing)
  - Verification states UI
  - External links management
- **TaskList.tsx**: Lista zadań z filtrowaniem
- **Header.tsx**: Top bar z licznikami i toggle
- **Auth/**: Komponenty autoryzacji
- **dialogs/**: Modalne dialogi (complete/abandon/transfer)

### 📊 Types & Utils (src/types/, src/utils/)
- **Task.ts**: Główny interface zadania z airtableData, **TaskPriority** z 'boosted' type
- **airtableHelpers.ts**: Mapowanie danych Airtable ↔ Task
- **taskUtils.ts**: Utility functions (filtering, **enhanced sorting** z boosted priority, purple colors)
- **helpers.ts**: History entries, date formatting

### 🧪 Tests
- **useTaskActions.test.tsx**: Assignment logic + **async boost operations testing**
- **TaskFocusedView.test.tsx**: UI components + **boost button loading states**
- **TaskFocusedView.wklejka.test.tsx**: 18 testów wklejka functionality
- **taskUtils.test.ts**: Task filtering, **enhanced sorting** z boosted priority
- Wszystkie pozostałe z pełnym coverage (169 testów total)

### ⚙️ Config Files
- **vite.config.ts**: Vite + Vitest setup
- **tailwind.config.js**: Tailwind CSS
- **tsconfig.json**: TypeScript config
- **.env**: Environment variables (Airtable, Supabase keys)

## Development Workflow (WAŻNE!)

### 🔄 **Workflow dla każdego zadania:**
1. **📋 DYSKUSJA PRZED KODEM** - Zawsze najpierw przedyskutować zadanie:
   - Zrozumieć problem dokładnie
   - Zadać pytania diagnostyczne  
   - Zaplanować rozwiązanie
   - Uzyskać zgodę na approach
2. **💻 IMPLEMENTACJA** - Dopiero wtedy zacząć kodowanie
3. **✅ TESTING** - Build + testy jednostkowe
4. **🧪 MANUAL TEST** - **ZAWSZE wymagany test ręczny od użytkownika przed deployem**
5. **🚀 DEPLOY** - Tylko po potwierdzeniu że działa poprawnie

### ⚠️ **NIGDY nie deployować bez:**
- ✅ Manual testing od użytkownika
- ✅ Potwierdzenia że funkcjonalność działa
- ✅ Wyraźnej zgody na deploy

### Nicht Erreichbar Boosted Priority Bug Fix (2025-08-22)
✅ **Naprawiono bug z boosted priority po "nicht erreichbar"**:

**Problem**: Po oznaczeniu zadania jako "nicht erreichbar", boosted priority nie był czyszczony + prymitywne `window.location.reload()`

**Rozwiązanie**:
- **Boosted Clearing**: Dodano `if (task.priority === 'boosted') { updates.priority = 'high'; }` do `handlePhoneCall(task, false)`
- **Usunięto prymitywny refresh**: Zamiast `window.location.reload()` → elegancka React state management
- **Comprehensive Testing**: Nowy test `should clear boosted priority when call is not reachable`
- **Automatyczne UI updates**: React automatycznie aktualizuje interfejs przez `onUpdateTask` callback

**Kluczowe wnioski z sesji**:
- 🚫 **NIGDY nie używać `window.location.reload()`** - to rozwiązanie z lat 90
- ✅ **React state management** automatycznie aktualizuje UI po `onUpdateTask()`
- ✅ **Spójność completion actions** - wszystkie akcje końcowe (complete/abandon/postpone/transfer/unassign/nicht_erreichbar) czyszczą boosted priority
- ✅ **Comprehensive test coverage** - każda completion action ma test dla boosted clearing

**Pliki**: useTaskActions.ts:288-290, TaskFocusedView.tsx:115-120, useTaskActions.test.tsx:298-317
**Testy**: 195 testów (1 nowy) ✅
**Deployment Status**: Ready - eleganckie rozwiązanie bez page reload

## Następne Sesje
- Monitoring działania nicht erreichbar boosted clearing w produkcji
- Monitoring działania user assignment race condition fix w produkcji
- Monitoring działania enhanced boost functionality w produkcji
- Monitoring działania users table fix w produkcji
- Monitoring działania wklejka functionality w produkcji
- Ewentualne ulepszenia UX (bulk operations, lepsze wizualne wskazówki)
- Nowe feature requests  
- Bug fixes
- Performance improvements

## Kluczowe Techniczne Insights

### Boost System Architecture
- **Exclusive State Management**: `boostingTask` state zapobiega równoczesnym operacjom
- **Priority Hierarchy**: `boosted > in_progress > dueDate > priority`
- **Async Flow**: Reset previous → Boost new → Update UI (sekwencyjnie)
- **UI States**: Loading spinners + disabled buttons during operations

### Loading States Pattern
```typescript
const [boostingTask, setBoostingTask] = useState<string | null>(null);

// Usage in components:
{boostingTask === task.id ? (
  <Loader2 className="animate-spin" />
) : (
  <AlertTriangle />
)}
```

### Exclusive Boost Logic
```typescript
// Reset previous boosted task
const currentBoostedTask = tasks.find(t => t.priority === 'boosted');
if (currentBoostedTask && currentBoostedTask.id !== taskId) {
  await onUpdateTask(currentBoostedTask.id, { priority: 'high' });
}
// Then boost new task
await onUpdateTask(taskId, { priority: 'boosted' });
```

### Anti-Patterns i Lessons Learned
```typescript
// 🚫 NIGDY - Prymitywne rozwiązania z lat 90
window.location.reload(); // Odświeżanie całej strony po akcji

// ✅ ZAWSZE - Eleganckie React patterns  
onUpdateTask(taskId, updates); // React state management auto-aktualizuje UI
```

**Kluczowe zasady**:
1. **React State First**: Zawsze polegaj na React state management zamiast manual refresh
2. **Consistency Patterns**: Jeśli jedna completion action ma behavior, wszystkie powinny
3. **Test Every Edge Case**: Każda nowa funkcjonalność = comprehensive test coverage  
4. **User Experience**: Zero page reloads w nowoczesnych SPA applications

### Bilingual System Implementation (2025-08-22)
✅ **Zaimplementowano kompletny system dwujęzyczny (PL/DE)**:

**Problem**: UI miało mieszane języki ("bałagan") - część po polsku, część po niemiecku

**Rozwiązanie**:
- **Supabase Integration**: `preferred_language` kolumna w profiles table z defaultem 'pl'
- **Extended User Interface**: Dodano language field do User type
- **Translation System**: 25+ nowych kluczy tłumaczeniowych w translations.ts
- **Language Persistence**: Zapis preferencji w Supabase przez updateUserLanguage()
- **UI Consistency**: Systematyczne zastąpienie hardcoded strings translation keys
- **Account Settings**: Kompletny language picker z flagami PL/DE

**Kluczowe lekcje z sesji**:
- 🚫 **NIGDY localStorage fallback** gdy user chce Supabase - "nie no kurde! robisz chałę!!!"
- ✅ **Database Schema First** - ALTER TABLE przed implementacją UI
- ✅ **Systematic String Replacement** - wszystkie visible UI elements muszą być przetłumaczone
- ✅ **Visual Feedback** - user pokazał screenshots z mixed languages, wymagał uważności
- ✅ **Scope Clarity** - Airtable data pozostać w oryginalnym języku, tylko UI tłumaczyć

**Critical User Feedback**:
- "pracujemy nad nową funkcjonalnością!!!! a ty mi local storage proponujesz mimo, że powiedziałem od początku że chcę supabase?"
- "popatrz uważniej, nadal się nie starasz, bądź bardziej uważny" (po pokazaniu mixed language screenshot)
- "może nie, ale napraw na razie te najważniejsze które widzisz na ekranie"

**Zmiany w kodzie**:
- `useUsers.ts`: Extended User interface z preferred_language + updateUserLanguage()
- `translations.ts`: Dodano 25+ kluczy (accountSettings, manageProfile, languagePreferences, etc.)
- `LanguageContext.tsx`: Load from Supabase + persist updates + default 'pl'
- `AccountSettings.tsx`: Language picker z flags + handleLanguageUpdate
- `Header.tsx`: "Wyloguj"→{t.signOut}, "Konto"→{t.account}
- `TaskFocusedView.tsx`: "Profil w portalu MM"→{t.profilePortalLink}, wklejka strings
- `LanguageSwitch.tsx`: setLanguage→updateUserLanguage dla persistence

**Database Schema**:
```sql
ALTER TABLE profiles ADD COLUMN preferred_language text DEFAULT 'pl';
```

**Testy**: 5 comprehensive tests dla bilingual system ✅
- Default language loading
- User preference persistence  
- Translation key coverage
- Error handling
- UI state management

**Pliki**: useUsers.ts, translations.ts, LanguageContext.tsx, AccountSettings.tsx, Header.tsx, TaskFocusedView.tsx, LanguageSwitch.tsx, LanguageContext.test.tsx

**Deployment Status**: Ready for deploy - systematic translation coverage completed

---
*Ostatnia aktualizacja: 2025-08-22 - Bilingual system completed, ready for deploy*