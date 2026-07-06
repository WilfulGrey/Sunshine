# Plan: Przywrócenie przycisku "słuchawka" — ręczne wyciąganie callbacku na górę

## Context

Centralka telefoniczna → integracja z Sunshine. Etap 1 (ten): **ręczny** mechanizm. Gdy CG dzwoni a jest np. 5. na liście, rekruter klika słuchawkę przy jej karcie → CG staje się aktywnym taskiem na górze. Działa dla **dowolnego** typu callbacku (interest, general, pre/post/pre_departure, reapply).

Etapy 2-3 (później, nie teraz): auto-popup przy przychodzącym połączeniu.

## Kluczowe ustalenie: wszystko już istnieje

`handleBoostPriority` (`src/hooks/useTaskActions.ts:542`) robi **dokładnie** to:
- przypisuje CG do bieżącego rekrutera (jeśli nie jego)
- `setCallback(now)` — ustawia callback na teraz (zachowuje `callbackSource`, `callbackId`, `callbackType` — działa dla każdego typu)
- lokalnie: `priority='boosted'`, `status='in_progress'`, `dueDate=now`
- resetuje poprzedni boosted/in_progress task (wzajemnie wykluczające)
- `sortTasksByPriority` TIER 1 = `priority==='boosted'` sortuje na sam wierzch → task staje się `nextTask` (hero)

Przycisk-słuchawka był wpięty w karty upcoming, **usunięty w commicie `5f9098f`** ("Hide boost buttons on upcoming tasks"). Handler został, tylko UI zniknęło.

## Zmiana (jeden plik)

**`src/components/TaskFocusedView.tsx`** — linia 1284, zamienić komentarz `{/* Boost buttons hidden for now */}` na przycisk słuchawki:

```jsx
<button
  onClick={() => {
    taskActions.handleBoostPriority(task.id);
    setRefreshDisabledAfterBoost(true);
  }}
  disabled={taskActions.boostingTask === task.id}
  className="p-1 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
  title="Osoba dzwoni - przenieś na pierwszą pozycję"
  data-testid={`boost-phone-${task.id}`}
>
  {taskActions.boostingTask === task.id
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : <Phone className="h-4 w-4" />}
</button>
```

- `Phone` i `Loader2` — już zaimportowane (`TaskFocusedView.tsx:2`).
- `setRefreshDisabledAfterBoost(true)` — pauzuje auto-refresh aż rekruter obsłuży task; ścieżki re-enable (`false`) już istnieją w handleReachable/Unreachable/close/postpone/abandon/transfer. Zgodne z istniejącym wzorcem refresh-guard.

**Tylko przycisk słuchawki** (`handleBoostPriority` → `status: in_progress`). NIE przywracam drugiego przycisku AlertTriangle/`handleBoostUrgent` — user prosił o słuchawkę i "staje się aktywnym taskiem", co odpowiada `in_progress`.

## Uwaga (brak problemu ze "stealing")

`filterActiveTasks` ukrywa taski przypisane do innego rekrutera → `upcomingTasks` zawiera tylko moje + nieprzypisane. Boost nieprzypisanego = przypisanie do mnie. Nie ma ryzyka podebrania cudzego.

## Test

`src/components/TaskFocusedView.test.tsx` — jeden test: gdy są upcoming tasks, klik `boost-phone-<id>` woła `taskActions.handleBoostPriority` z id taska. (Mock `handleBoostPriority` jest już w mocku `useTaskActions` w tym pliku.)

## Weryfikacja

1. `npm run build` + `npm run test` (oczekiwane: 272 + 1 nowy = 273, +2 skipped)
2. Manualnie po deployu: lista z ≥2 taskami → klik słuchawki przy 3. tasku → wskakuje na górę jako aktywny (hero pokazuje Odebrała/Nie odebrała). Zadziała też dla taska typu `pre_departure` (potwierdzenie wyjazdu).
