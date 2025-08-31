● Plan: Auto-refresh po dodaniu nowego rekordu do Airtable

  🎯 Overview

  Zbudujemy system, który automatycznie odświeży widok użytkowników gdy nowy rekord zostanie dodany do Airtable.
  Wykorzystamy Airtable webhook → Supabase Edge Function → real-time broadcast do wszystkich połączonych klientów.

  📁 Pliki do zmiany/dodania

  Nowe pliki:

  1. supabase/functions/airtable-webhook/index.ts - Edge Function odbierająca webhook
  2. src/hooks/useNewRecordListener.ts - Hook obsługujący nowe rekordy
  3. src/hooks/useNewRecordListener.test.ts - Testy hooka

  Modyfikowane pliki:

  1. src/hooks/useAirtable.ts - Integracja z new record listener
  2. src/components/TaskFocusedView.tsx - Rozszerzenie real-time listenera
  3. src/components/TaskFocusedView.realtime.test.tsx - Rozszerzenie testów real-time

  🔧 Funkcje do implementacji

  Supabase Edge Function

  // supabase/functions/airtable-webhook/index.ts
  handleAirtableWebhook(request: Request): Response
  Odbiera webhook z Airtable, waliduje payload, wysyła broadcast o nowym rekordzie.

  New Record Hook

  // src/hooks/useNewRecordListener.ts
  useNewRecordListener(onNewRecord: () => void): void
  Słucha real-time eventów o nowych rekordach, wywołuje callback do odświeżenia danych.

  handleNewRecordEvent(payload: NewRecordPayload): void
  Przetwarza event nowego rekordu, loguje informacje, wywołuje refresh.

  useAirtable Integration

  // src/hooks/useAirtable.ts (modyfikacja istniejącej)
  setupNewRecordRefresh(): void
  Integruje new record listener z istniejącym loadContacts, zapewnia debouncing.

  TaskFocusedView Enhancement

  // src/components/TaskFocusedView.tsx (rozszerzenie istniejącego)
  handleNewRecordBroadcast(event: NewRecordEvent): void
  Rozszerza istniejący real-time listener o obsługę new-record eventów.

  🧪 Testy do napisania

  useNewRecordListener.test.ts

  'should setup new record listener on mount'
  // Weryfikuje że listener jest aktywowany po mount

  'should call onNewRecord callback when event received'
  // Testuje że callback jest wywoływany po otrzymaniu eventu

  'should cleanup listener on unmount'
  // Sprawdza proper cleanup przy unmount

  'should debounce multiple rapid new record events'
  // Testuje że szybkie eventy są debounced

  useAirtable enhanced tests

  'should refresh data when new record event received'
  // Weryfikuje że loadContacts jest called po new record

  'should not refresh if already loading'
  // Testuje że nie ma podwójnego refreshu podczas loading

  TaskFocusedView.realtime enhanced tests

  'should handle new-record broadcast events'
  // Testuje obsługę new-record w real-time listener

  'should refresh task list on new record event'
  // Weryfikuje że UI się odświeża po new record

  'should show loading state during new record refresh'
  // Testuje loading states podczas refresh

  🔄 Flow Architecture

  1. Nowy rekord dodany do Airtable
  2. Airtable webhook → Supabase Edge Function
  3. Edge Function → Supabase real-time broadcast
  4. useNewRecordListener → odbiera event
  5. useAirtable → wywołuje loadContacts()
  6. TaskFocusedView → UI refresh z nowymi danymi

  Gotowy do implementacji! 🚀
