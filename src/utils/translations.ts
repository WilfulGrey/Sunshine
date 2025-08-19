export type Language = 'de' | 'pl';

export interface Translations {
  // Header
  appTitle: string;
  notifications: string;
  manage: string;

  // Main page
  yourTasks: string;
  workTasksInOrder: string;
  newTask: string;
  newTasks: string;
  resetTestTasks: string;
  resetTestTasksDescription: string;
  currentTasks: string;

  // Task form
  editTask: string;
  createNewTask: string;
  title: string;
  titleRequired: string;
  titlePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  type: string;
  typeRequired: string;
  priority: string;
  priorityRequired: string;
  status: string;
  dueDate: string;
  assignedTo: string;
  notAssigned: string;
  triggerEvent: string;
  triggerPlaceholder: string;
  voicebotConfig: string;
  voicebotSystem: string;
  scriptMessage: string;
  scriptPlaceholder: string;
  scheduledFor: string;
  cancel: string;
  create: string;
  update: string;

  // Task types
  manual: string;
  automatic: string;
  voicebot: string;

  // Priorities
  low: string;
  medium: string;
  high: string;
  urgent: string;

  // Status
  pending: string;
  inProgress: string;
  completed: string;
  cancelled: string;

  // Categories
  matchingContact: string;
  contractManagement: string;
  communication: string;
  qualityControl: string;
  compliance: string;
  administration: string;

  // Team members
  mariaSchmidt: string;
  thomasWeber: string;
  annaMueller: string;
  michaelBauer: string;
  sandraKoch: string;

  // Task focused view
  allTasksCompleted: string;
  greatWork: string;
  noOpenTasks: string;
  upcomingTasks: string;
  overdue: string;
  startNow: string;
  complete: string;
  postpone: string;

  // Phone dialog
  startCall: string;
  phoneNumber: string;
  clickToCall: string;
  wasPersonReachable: string;
  yesReachable: string;
  notReachable: string;

  // Postpone dialog
  setPostpone: string;
  quickSelection: string;
  in1Hour: string;
  in2Hours: string;
  tomorrow9: string;
  tomorrow14: string;
  nextWeek: string;
  in1Week: string;
  orSelectCustomTime: string;
  confirm: string;

  // History
  activityHistory: string;
  actions: string;
  lastAction: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  undo: string;

  // History actions
  taskCreated: string;
  processingStarted: string;
  successfullyCompleted: string;
  postponeScheduled: string;
  taskCancelled: string;
  callSuccessful: string;
  callUnsuccessful: string;

  // History details
  callSuccessfulDetails: string;
  callUnsuccessfulDetails: string;
  postponeDetails: string;
  completedDetails: string;

  // Status overview
  total: string;
  overdueStatus: string;

  // Sample tasks
  sampleTask1Title: string;
  sampleTask1Description: string;
  sampleTask2Title: string;
  sampleTask2Description: string;
  sampleTask3Title: string;
  sampleTask3Description: string;
  sampleTask4Title: string;
  sampleTask4Description: string;
  sampleTask5Title: string;
  sampleTask5Description: string;
  sampleTask6Title: string;
  sampleTask6Description: string;
  sampleTask7Title: string;
  sampleTask7Description: string;
  sampleTask8Title: string;
  sampleTask8Description: string;
  sampleTask9Title: string;
  sampleTask9Description: string;

  // Common
  edit: string;
  delete: string;
  start: string;
  task: string;
  tasks: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  inDays: string;
  daysAgo: string;
  nextTask: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    // Header
    appTitle: 'Mamamia Tasks',
    notifications: 'Benachrichtigungen',
    manage: 'Verwalten',

    // Main page
    yourTasks: 'Ihre Aufgaben',
    workTasksInOrder: 'Arbeiten Sie Ihre Aufgaben der Reihe nach ab',
    newTask: 'Neue Aufgabe',
    newTasks: 'neue Aufgaben',
    resetTestTasks: 'Test-Aufgaben neu erstellen',
    resetTestTasksDescription: 'Erstellt die 9 Test-Aufgaben neu zum Testen (Aktuell: {count} Aufgaben)',
    currentTasks: 'Aufgaben',

    // Task form
    editTask: 'Aufgabe bearbeiten',
    createNewTask: 'Neue Aufgabe erstellen',
    title: 'Titel',
    titleRequired: 'Titel *',
    titlePlaceholder: 'Aufgabentitel eingeben...',
    description: 'Beschreibung',
    descriptionPlaceholder: 'Detaillierte Beschreibung der Aufgabe...',
    type: 'Typ',
    typeRequired: 'Typ *',
    priority: 'Priorität',
    priorityRequired: 'Priorität *',
    status: 'Status',
    dueDate: 'Fälligkeitsdatum',
    assignedTo: 'Zugewiesen an',
    notAssigned: 'Nicht zugewiesen',
    triggerEvent: 'Trigger-Event',
    triggerPlaceholder: 'z.B. Successful Match Event',
    voicebotConfig: 'Voicebot-Konfiguration',
    voicebotSystem: 'Voicebot System',
    scriptMessage: 'Script/Nachricht',
    scriptPlaceholder: 'Text für den Voicebot...',
    scheduledFor: 'Geplant für',
    cancel: 'Abbrechen',
    create: 'Erstellen',
    update: 'Aktualisieren',

    // Task types
    manual: '📝 Manuell',
    automatic: '⚡ Automatisch',
    voicebot: '🤖 Voicebot',

    // Priorities
    low: '🟢 Niedrig',
    medium: '🟡 Mittel',
    high: '🟠 Hoch',
    urgent: '🔴 Dringend',

    // Status
    pending: '⏳ Ausstehend',
    inProgress: '🔄 In Bearbeitung',
    completed: '✅ Abgeschlossen',
    cancelled: '❌ Abgebrochen',

    // Categories
    matchingContact: 'Matching & Kontakt',
    contractManagement: 'Vertragsmanagement',
    communication: 'Kommunikation',
    qualityControl: 'Qualitätskontrolle',
    compliance: 'Compliance',
    administration: 'Administration',

    // Team members
    mariaSchmidt: 'Maria Schmidt',
    thomasWeber: 'Thomas Weber',
    annaMueller: 'Anna Müller',
    michaelBauer: 'Michael Bauer',
    sandraKoch: 'Sandra Koch',

    // Task focused view
    allTasksCompleted: 'Alle Aufgaben erledigt! 🎉',
    greatWork: 'Großartige Arbeit! Momentan gibt es keine offenen Aufgaben.',
    noOpenTasks: 'Keine offenen Aufgaben',
    upcomingTasks: '📅 Kommende Aufgaben',
    overdue: '🚨 Überfällig',
    startNow: 'Jetzt starten',
    complete: 'Abschließen',
    postpone: 'Wiedervorlage',

    // Phone dialog
    startCall: 'Anruf starten',
    phoneNumber: 'Telefonnummer:',
    clickToCall: 'Klicken zum Anrufen',
    wasPersonReachable: 'War die Person erreichbar?',
    yesReachable: 'Ja, erreichbar',
    notReachable: 'Nicht erreichbar',

    // Postpone dialog
    setPostpone: 'Wiedervorlage festlegen',
    quickSelection: 'Schnellauswahl:',
    in1Hour: 'In 1 Stunde',
    in2Hours: 'In 2 Stunden',
    tomorrow9: 'Morgen 9:00',
    tomorrow14: 'Morgen 14:00',
    nextWeek: 'Nächste Woche',
    in1Week: 'In 1 Woche',
    orSelectCustomTime: 'Oder individuelle Zeit wählen:',
    confirm: 'Bestätigen',

    // History
    activityHistory: 'Aktivitäts-Historie',
    actions: 'Aktionen',
    lastAction: 'Letzte vor',
    justNow: 'Gerade eben',
    minutesAgo: 'vor {minutes} Min',
    hoursAgo: 'vor {hours} Std',
    undo: 'Rückgängig machen',

    // History actions
    taskCreated: 'Aufgabe erstellt',
    processingStarted: 'Bearbeitung gestartet',
    successfullyCompleted: 'Erfolgreich abgeschlossen',
    postponeScheduled: 'Wiedervorlage terminiert',
    taskCancelled: 'Aufgabe abgebrochen',
    callSuccessful: 'Anruf erfolgreich',
    callUnsuccessful: 'Anruf nicht erfolgreich',

    // History details
    callSuccessfulDetails: 'Anruf erfolgreich - Person war telefonisch erreichbar und Gespräch geführt',
    callUnsuccessfulDetails: 'Anruf nicht erfolgreich - Person war nicht erreichbar (Mailbox/kein Anschluss). Aufgabe als erledigt markiert.',
    postponeDetails: 'Wiedervorlage gesetzt - Aufgabe wird am {date} erneut vorgelegt. Grund: Zeitpunkt nicht passend oder weitere Informationen erforderlich.',
    completedDetails: 'Aufgabe erfolgreich abgeschlossen - alle erforderlichen Schritte wurden durchgeführt',

    // Status overview
    total: 'Gesamt',
    overdueStatus: 'Überfällig',

    // Sample tasks
    sampleTask1Title: 'Max Mustermann - Abgelehnt',
    sampleTask1Description: 'CG über Ablehnung informieren, Gründe erfragen und alternative Jobmöglichkeiten präsentieren. Motivation aufrechterhalten und nächste passende Positionen vorschlagen.',
    sampleTask2Title: 'Anna Weber - Vom Kunden angefragt',
    sampleTask2Description: 'Kundenanfrage bearbeiten und CG kontaktieren. Job-Details besprechen, Verfügbarkeit prüfen und bei Interesse weitere passende Positionen aus dem Portfolio vorstellen.',
    sampleTask3Title: 'Sarah Schmidt - Job geliked (bekannt)',
    sampleTask3Description: 'CG hat Interesse an Position gezeigt. Sofort beim Kunden vorschlagen, Profil übermitteln und Matching-Prozess einleiten. Feedback vom Kunden einholen.',
    sampleTask4Title: 'Michael Bauer - Job geliked (unbekannt)',
    sampleTask4Description: 'Neue CG hat Job geliked. Anrufen, Profil vervollständigen, Qualifikationen abklären und bei Eignung beim Kunden vorschlagen. Erwartungen und Konditionen besprechen.',
    sampleTask5Title: 'Lisa Müller - Status: WILL ARBEITEN',
    sampleTask5Description: 'CG hat Status auf "WILL ARBEITEN" geändert. Sofort kontaktieren, aktuelle Verfügbarkeit besprechen und passende Jobs aus dem aktuellen Portfolio präsentieren.',
    sampleTask6Title: 'Thomas Klein - Telefontermin',
    sampleTask6Description: 'Vereinbarter Telefontermin einhalten. Aktuelle Situation besprechen, Wünsche und Anforderungen abklären und passende Jobmöglichkeiten präsentieren.',
    sampleTask7Title: 'Jennifer Wagner - Neuer LEAD',
    sampleTask7Description: 'Neuen Lead bearbeiten. Vollständiges Profil erstellen, Qualifikationen und Erfahrungen erfassen, über Mamamia aufklären und erste passende Jobvorschläge unterbreiten.',
    sampleTask8Title: 'Robert Fischer - Nach Einsatz abgereist',
    sampleTask8Description: 'Follow-up nach abgeschlossenem Einsatz. Zufriedenheit mit Job und Kunde erfragen, Feedback dokumentieren, nächste Verfügbarkeit klären und neue Einsätze anbieten.',
    sampleTask9Title: 'Sandra Hoffmann - Bekannt, ohne Einsatz',
    sampleTask9Description: 'Regelmäßiger Check-in mit bekannter CG ohne aktuellen Einsatz. Situation erfragen, Unterstützungsbedarf klären und neue Jobmöglichkeiten anbieten.',

    // Common
    edit: 'Bearbeiten',
    delete: 'Löschen',
    start: 'Starten',
    task: 'Aufgabe',
    tasks: 'Aufgaben',
    today: 'Heute',
    tomorrow: 'Morgen',
    yesterday: 'Gestern',
    inDays: 'In {days} Tagen',
    daysAgo: 'Vor {days} Tagen',
    nextTask: 'Nächste Aufgabe',
  },
  pl: {
    // Header
    appTitle: 'Mamamia Zadania',
    notifications: 'Powiadomienia',
    manage: 'Zarządzaj',

    // Main page
    yourTasks: 'Twoje zadania',
    workTasksInOrder: 'Wykonuj swoje zadania po kolei',
    newTask: 'Nowe zadanie',
    newTasks: 'nowe zadania',
    resetTestTasks: 'Utwórz ponownie zadania testowe',
    resetTestTasksDescription: 'Tworzy ponownie 9 zadań testowych do testowania (Obecnie: {count} zadań)',
    currentTasks: 'Zadania',

    // Task form
    editTask: 'Edytuj zadanie',
    createNewTask: 'Utwórz nowe zadanie',
    title: 'Tytuł',
    titleRequired: 'Tytuł *',
    titlePlaceholder: 'Wprowadź tytuł zadania...',
    description: 'Opis',
    descriptionPlaceholder: 'Szczegółowy opis zadania...',
    type: 'Typ',
    typeRequired: 'Typ *',
    priority: 'Priorytet',
    priorityRequired: 'Priorytet *',
    status: 'Status',
    dueDate: 'Termin wykonania',
    assignedTo: 'Przypisane do',
    notAssigned: 'Nie przypisane',
    triggerEvent: 'Zdarzenie wyzwalające',
    triggerPlaceholder: 'np. Successful Match Event',
    voicebotConfig: 'Konfiguracja Voicebot',
    voicebotSystem: 'System Voicebot',
    scriptMessage: 'Skrypt/Wiadomość',
    scriptPlaceholder: 'Tekst dla Voicebot...',
    scheduledFor: 'Zaplanowane na',
    cancel: 'Anuluj',
    create: 'Utwórz',
    update: 'Aktualizuj',

    // Task types
    manual: '📝 Ręczne',
    automatic: '⚡ Automatyczne',
    voicebot: '🤖 Voicebot',

    // Priorities
    low: '🟢 Niski',
    medium: '🟡 Średni',
    high: '🟠 Wysoki',
    urgent: '🔴 Pilny',

    // Status
    pending: '⏳ Oczekujące',
    inProgress: '🔄 W trakcie',
    completed: '✅ Zakończone',
    cancelled: '❌ Anulowane',

    // Categories
    matchingContact: 'Dopasowanie i Kontakt',
    contractManagement: 'Zarządzanie Umowami',
    communication: 'Komunikacja',
    qualityControl: 'Kontrola Jakości',
    compliance: 'Zgodność',
    administration: 'Administracja',

    // Team members
    mariaSchmidt: 'Maria Schmidt',
    thomasWeber: 'Thomas Weber',
    annaMueller: 'Anna Müller',
    michaelBauer: 'Michael Bauer',
    sandraKoch: 'Sandra Koch',

    // Task focused view
    allTasksCompleted: 'Wszystkie zadania wykonane! 🎉',
    greatWork: 'Świetna robota! Obecnie nie ma otwartych zadań.',
    noOpenTasks: 'Brak otwartych zadań',
    upcomingTasks: '📅 Nadchodzące zadania',
    overdue: '🚨 Przeterminowane',
    startNow: 'Rozpocznij teraz',
    complete: 'Zakończ',
    postpone: 'Odłóż',

    // Phone dialog
    startCall: 'Rozpocznij połączenie',
    phoneNumber: 'Numer telefonu:',
    clickToCall: 'Kliknij aby zadzwonić',
    wasPersonReachable: 'Czy osoba była dostępna?',
    yesReachable: 'Tak, dostępna',
    notReachable: 'Niedostępna',

    // Postpone dialog
    setPostpone: 'Ustaw przypomnienie',
    quickSelection: 'Szybki wybór:',
    in1Hour: 'Za 1 godzinę',
    in2Hours: 'Za 2 godziny',
    tomorrow9: 'Jutro 9:00',
    tomorrow14: 'Jutro 14:00',
    nextWeek: 'Następny tydzień',
    in1Week: 'Za 1 tydzień',
    orSelectCustomTime: 'Lub wybierz własny czas:',
    confirm: 'Potwierdź',

    // History
    activityHistory: 'Historia Aktywności',
    actions: 'Akcje',
    lastAction: 'Ostatnia',
    justNow: 'Właśnie teraz',
    minutesAgo: '{minutes} min temu',
    hoursAgo: '{hours} godz temu',
    undo: 'Cofnij',

    // History actions
    taskCreated: 'Zadanie utworzone',
    processingStarted: 'Rozpoczęto przetwarzanie',
    successfullyCompleted: 'Pomyślnie zakończone',
    postponeScheduled: 'Zaplanowano przypomnienie',
    taskCancelled: 'Zadanie anulowane',
    callSuccessful: 'Połączenie udane',
    callUnsuccessful: 'Połączenie nieudane',

    // History details
    callSuccessfulDetails: 'Połączenie udane - osoba była dostępna telefonicznie i przeprowadzono rozmowę',
    callUnsuccessfulDetails: 'Połączenie nieudane - osoba była niedostępna (poczta głosowa/brak połączenia). Zadanie oznaczone jako wykonane.',
    postponeDetails: 'Ustawiono przypomnienie - zadanie zostanie ponownie przedstawione {date}. Powód: nieodpowiedni czas lub potrzebne dodatkowe informacje.',
    completedDetails: 'Zadanie pomyślnie zakończone - wszystkie wymagane kroki zostały wykonane',

    // Status overview
    total: 'Łącznie',
    overdueStatus: 'Przeterminowane',

    // Sample tasks
    sampleTask1Title: 'Max Mustermann - Odrzucony',
    sampleTask1Description: 'Poinformować CG o odrzuceniu, zapytać o powody i przedstawić alternatywne możliwości pracy. Utrzymać motywację i zaproponować następne odpowiednie pozycje.',
    sampleTask2Title: 'Anna Weber - Zapytanie od klienta',
    sampleTask2Description: 'Przetworzyć zapytanie klienta i skontaktować się z CG. Omówić szczegóły pracy, sprawdzić dostępność i w przypadku zainteresowania przedstawić dalsze odpowiednie pozycje z portfolio.',
    sampleTask3Title: 'Sarah Schmidt - Polubiono pracę (znana)',
    sampleTask3Description: 'CG wykazała zainteresowanie pozycją. Natychmiast zaproponować klientowi, przesłać profil i rozpocząć proces dopasowania. Uzyskać opinię od klienta.',
    sampleTask4Title: 'Michael Bauer - Polubiono pracę (nieznany)',
    sampleTask4Description: 'Nowy CG polubił pracę. Zadzwonić, uzupełnić profil, wyjaśnić kwalifikacje i w przypadku odpowiedniości zaproponować klientowi. Omówić oczekiwania i warunki.',
    sampleTask5Title: 'Lisa Müller - Status: CHCE PRACOWAĆ',
    sampleTask5Description: 'CG zmieniła status na "CHCE PRACOWAĆ". Natychmiast skontaktować się, omówić aktualną dostępność i przedstawić odpowiednie prace z aktualnego portfolio.',
    sampleTask6Title: 'Thomas Klein - Termin telefoniczny',
    sampleTask6Description: 'Dotrzymać umówionego terminu telefonicznego. Omówić aktualną sytuację, wyjaśnić życzenia i wymagania oraz przedstawić odpowiednie możliwości pracy.',
    sampleTask7Title: 'Jennifer Wagner - Nowy LEAD',
    sampleTask7Description: 'Przetworzyć nowy lead. Utworzyć kompletny profil, zarejestrować kwalifikacje i doświadczenia, poinformować o Mamamia i przedstawić pierwsze odpowiednie propozycje pracy.',
    sampleTask8Title: 'Robert Fischer - Wyjechał po zadaniu',
    sampleTask8Description: 'Follow-up po zakończonym zadaniu. Zapytać o zadowolenie z pracy i klienta, udokumentować opinię, wyjaśnić następną dostępność i zaoferować nowe zadania.',
    sampleTask9Title: 'Sandra Hoffmann - Znana, bez zadania',
    sampleTask9Description: 'Regularne sprawdzenie ze znanym CG bez aktualnego zadania. Zapytać o sytuację, wyjaśnić potrzeby wsparcia i zaoferować nowe możliwości pracy.',

    // Common
    edit: 'Edytuj',
    delete: 'Usuń',
    start: 'Rozpocznij',
    task: 'zadanie',
    tasks: 'zadania',
    today: 'Dzisiaj',
    tomorrow: 'Jutro',
    yesterday: 'Wczoraj',
    inDays: 'Za {days} dni',
    daysAgo: '{days} dni temu',
    nextTask: 'Następne zadanie',
  }
};

export const useTranslation = (language: Language) => {
  return translations[language];
};