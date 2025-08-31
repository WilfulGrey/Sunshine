
  ⚠️ Główne Zagrożenia i Problemy

  1. Architektoniczny Anti-Pattern: Dual Data Sources

  // PROBLEM: Będziemy mieć 2 źródła truth
  Airtable (primary data) ← → Supabase (real-time events)
  Zagrożenie: Race conditions między webhook a bezpośrednimi zmianami w Airtable

  2. Webhook Reliability Issues

  - Airtable webhooks nie są 100% reliable - mogą failować, retry, duplicate
  - No ordering guarantee - webhook może przyjść PRZED ukończeniem transakcji
  - Network failures mogą spowodować missed notifications

  3. Security & Validation Gap

  // Edge Function musi walidować:
  // 1. Czy webhook rzeczywiście z Airtable?
  // 2. Czy payload nie jest malicious?
  // 3. Rate limiting przeciwko spam attacks

  4. Performance Impact

  - Broadcast to ALL users na każdy nowy rekord = unnecessary network traffic
  - Throttling/debouncing będzie kompleksowy przy multiple rapid additions
  - Loading states mogą być chaotyczne przy częstych refreshach

  🏗️ Architekturalne Problemy

  1. Complexity Explosion

  Obecny system: Airtable → useAirtable → UI
  Nowy system: Airtable → Webhook → Edge Function → Supabase → useNewRecordListener → useAirtable → UI

  6x więcej punktów failure!

  2. Testing Nightmare

  // Jak testować edge cases?
  - Webhook delays
  - Duplicate webhooks
  - Partial failures
  - Network timeouts
  - Concurrent user actions during refresh

  3. Debugging Complexity

  # Troubleshooting będzie wymagał access do:
  - Airtable webhook logs
  - Supabase Edge Function logs
  - Supabase real-time metrics
  - Client-side network logs

  🔍 Szczegółowa Analiza Kodu

  Edge Function Vulnerabilities

  // supabase/functions/airtable-webhook/index.ts
  // BRAKUJE:
  handleAirtableWebhook(request: Request): Response {
    // ❌ Brak webhook signature validation
    // ❌ Brak rate limiting
    // ❌ Brak payload size limits
    // ❌ Brak error handling for malformed JSON
  }

  Hook Design Issues

  // useNewRecordListener.ts
  // PROBLEM: Jak rozróżnić między:
  // - New record for THIS user
  // - New record for OTHER user
  // - New record that should trigger full refresh vs partial update

  Integration Complexity

  // useAirtable.ts modification
  setupNewRecordRefresh(): void {
    // PROBLEMY:
    // - Jak uniknąć refresh loops?
    // - Co jeśli loadContacts już w trakcie?
    // - Jak handle concurrent webhooks?
  }

  ✅ Lepsze Alternatywy

  Opcja 1: Polling Enhancement (Recommended)

  // Rozszerz istniejący useAirtable
  useAirtable({
    pollInterval: 30000, // 30s
    smartPolling: true,   // Poll faster when user active
    backgroundSync: true  // Sync when tab visible
  });

  Opcja 2: Server-Sent Events

  // Prostszy niż webhooks, bardziej reliable
  useAirtableSSE({
    endpoint: '/api/airtable-stream',
    reconnectOnError: true,
    heartbeat: true
  });

  Opcja 3: Optimistic UI Updates

  // Update UI immediately, sync in background
  const { optimisticAdd } = useOptimisticTasks();
  optimisticAdd(newTask); // UI updates instantly
  syncWithAirtable();     // Background verification

  📊 Risk Assessment

  | Aspect      | Current Risk | With Webhook | Mitigation Cost         |
  |-------------|--------------|--------------|-------------------------|
  | Complexity  | Low          | High         | 2-3 tygodnie            |
  | Reliability | High         | Medium       | Ongoing monitoring      |
  | Performance | Good         | Variable     | Caching layer needed    |
  | Security    | Good         | Risk         | Security audit required |
  | Maintenance | Low          | High         | Extra DevOps overhead   |

  🎯 Moja Rekomendacja

  NIE implementować tego planu z następujących powodów:

  1. Obecny system działa idealnie (219/219 tests passing)
  2. ROI jest negatywny - duże ryzyko vs małą korzyść
  3. Violates YAGNI principle - czy naprawdę potrzebujemy instant notifications?

  Zamiast tego, zaproponuj:

  // Minimal enhancement - 1 dzień pracy
  const useSmartRefresh = () => {
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Refresh gdy user becomes active after period of inactivity
    useEffect(() => {
      const handleActivity = () => {
        const timeSinceLastActivity = Date.now() - lastActivity;
        if (timeSinceLastActivity > 5 * 60 * 1000) { // 5 min
          loadContacts(); // Smart refresh
        }
      };

      window.addEventListener('focus', handleActivity);
      return () => window.removeEventListener('focus', handleActivity);
    }, [lastActivity]);
  };

  Podsumowanie: Plan developera wprowadza wysokie ryzyko przy minimalnej korzyści. Obecna architektura jest proven,
  stable, i testowana. Sugeruję focus na core business features zamiast przedwczesnej optimalizacji.