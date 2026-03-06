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

  // Action buttons
  take: string;
  taking: string;
  abandon: string;
  phone: string;
  finish: string;
  transfer: string;
  
  // Phone call related
  reachable: string;
  unreachable: string;
  callResult: string;
  
  // Assignment related
  assigned: string;
  unassigned: string;
  assignedTo: string;
  assigningInProgress: string;
  verifyingAssignment: string;
  assignmentFailed: string;
  
  // Account Settings
  accountSettings: string;
  manageProfile: string;
  profile: string;
  password: string;
  language: string;
  backToApp: string;
  loggedInAs: string;
  fullName: string;
  emailAddress: string;
  emailCannotBeChanged: string;
  updateProfile: string;
  updating: string;
  newPassword: string;
  confirmPassword: string;
  changePassword: string;
  changing: string;
  passwordsDoNotMatch: string;
  passwordTooShort: string;
  profileUpdatedSuccess: string;
  passwordChangedSuccess: string;
  logOut: string;
  endSession: string;
  languagePreferences: string;
  selectLanguageInterface: string;
  changeAppliedImmediately: string;
  active: string;
  polish: string;
  german: string;
  polishLanguage: string;
  germanLanguage: string;
  languageInfo: string;
  languageChangedSuccess: string;
  failedToChangeLanguage: string;
  
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
    wasPersonReachable: 'Hat sie ans Telefon gegangen?',
    yesReachable: 'Abgenommen',
    notReachable: 'Nicht abgenommen',

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

    // Account Settings
    unexpectedError: 'Ein unerwarteter Fehler ist aufgetreten',
    passwordChangeWarning: 'Passwort wurde möglicherweise geändert. Bitte prüfen Sie, ob das neue Passwort funktioniert.',

    // Reset Password Form
    passwordsNotIdentical: 'Passwörter sind nicht identisch',
    passwordMinLength: 'Passwort muss mindestens 6 Zeichen haben',
    passwordResetSuccess: 'Passwort wurde erfolgreich geändert! Sie können sich jetzt anmelden.',
    backToLogin: 'Zurück zur Anmeldung',

    // External Links
    profilePortalLink: 'Profil im MM-Portal',
    dashboardRetellLink: 'Retell Dashboard',
    jobLink: 'Job-Link',
    addWklejka: 'Wklejka hinzufügen',
    editWklejka: 'Wklejka bearbeiten',
    removeWklejka: 'Wklejka entfernen (fehlgeschlagen)',
    agentNote: 'Agent-Notiz:',
    nextSteps: 'Nächste Schritte:',
    removeUrgentStatus: 'Dringend-Status entfernen',
    failedWklejka: 'Fehlgeschlagene Wklejka:',
    wklejkaOldWarning: 'Wklejka älter als 24h - prüfen Sie, ob sie verarbeitet wurde',
    
    // Header Navigation
    account: 'Konto',
    accountSettings: 'Kontoeinstellungen',
    signOut: 'Abmelden',
    signOutTitle: 'Abmelden',

    // Status overview
    total: 'Gesamt',
    overdueStatus: 'Überfällig',

    // Action buttons
    take: 'Übernehmen',
    taking: 'Zuweisen...',
    abandon: 'Kontakt abbrechen',
    phone: 'Telefon',
    finish: 'Abschließen',
    transfer: 'Übertragen',
    
    // Phone call related
    reachable: 'Erreichbar',
    unreachable: 'Nicht erreichbar',
    callResult: 'Anrufergebnis',
    
    // Assignment related
    assigned: 'Zugewiesen',
    unassigned: 'Nicht zugewiesen',
    assignedTo: 'Zugewiesen an: {name}',
    assigningInProgress: 'Zuweisen...',
    verifyingAssignment: 'Zuweisung wird überprüft...',
    assignmentFailed: 'Zuweisungsfehler - bitte erneut versuchen',

    // Account Settings
    manageProfile: 'Verwalten Sie Ihr Profil und Passwort',
    profile: 'Profil',
    password: 'Passwort',
    language: 'Sprache',
    backToApp: 'Zurück zur Anwendung',
    loggedInAs: 'Angemeldet als',
    fullName: 'Vollständiger Name',
    emailAddress: 'E-Mail-Adresse',
    emailCannotBeChanged: 'E-Mail-Adresse kann nicht geändert werden. Kontaktieren Sie den Administrator, wenn Sie eine Änderung benötigen.',
    updateProfile: 'Profil aktualisieren',
    updating: 'Aktualisierung...',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort bestätigen',
    changePassword: 'Passwort ändern',
    changing: 'Ändern...',
    passwordsDoNotMatch: 'Neue Passwörter stimmen nicht überein',
    passwordTooShort: 'Neues Passwort muss mindestens 6 Zeichen haben',
    profileUpdatedSuccess: 'Profil wurde erfolgreich aktualisiert!',
    passwordChangedSuccess: 'Passwort wurde erfolgreich geändert!',
    logOut: 'Abmelden',
    endSession: 'Sitzung beenden und zur Anmeldeseite zurückkehren',
    languagePreferences: 'Spracheinstellungen',
    selectLanguageInterface: 'Wählen Sie die Sprache der Anwendungsoberfläche. Die Änderung wird sofort angewendet.',
    changeAppliedImmediately: 'Die Änderung wird sofort angewendet',
    active: 'Aktiv',
    polish: 'Polski',
    german: 'Deutsch',
    polishLanguage: 'Polnische Sprache',
    germanLanguage: 'Deutsche Sprache',
    languageInfo: 'Ihre Spracheinstellungen werden im Benutzerprofil gespeichert und beim nächsten Login gespeichert.',
    languageChangedSuccess: 'Sprache wurde erfolgreich geändert!',
    failedToChangeLanguage: 'Sprache konnte nicht geändert werden. Bitte versuchen Sie es erneut.',
    
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
    wasPersonReachable: 'Czy odebrała telefon?',
    yesReachable: 'Odebrała',
    notReachable: 'Nie odebrała',

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

    // Account Settings
    unexpectedError: 'Wystąpił nieoczekiwany błąd',
    passwordChangeWarning: 'Hasło mogło zostać zmienione. Sprawdź czy nowe hasło działa.',

    // Reset Password Form
    passwordsNotIdentical: 'Hasła nie są identyczne',
    passwordMinLength: 'Hasło musi mieć co najmniej 6 znaków',
    passwordResetSuccess: 'Hasło zostało zmienione pomyślnie! Możesz się teraz zalogować.',
    backToLogin: 'Powrót do logowania',

    // External Links
    profilePortalLink: 'Profil w portalu MM',
    dashboardRetellLink: 'Dashboard Retell',
    jobLink: 'Link do JOBa',
    addWklejka: 'Dodaj wklejkę',
    editWklejka: 'Edytuj wklejkę',
    removeWklejka: 'Usuń wklejkę (nieudana)',
    agentNote: 'Notatka Agenta:',
    nextSteps: 'Następne kroki:',
    removeUrgentStatus: 'Usuń status pilny',
    failedWklejka: 'Nieudanych wklejek:',
    wklejkaOldWarning: 'Wklejka starsza niż 24h - sprawdź czy przeszła',
    
    // Header Navigation
    account: 'Konto',
    accountSettings: 'Ustawienia konta',
    signOut: 'Wyloguj',
    signOutTitle: 'Wyloguj się',

    // Action buttons
    take: 'Biorę',
    taking: 'Przypisuję...',
    abandon: 'Porzuć kontakt',
    phone: 'Telefon',
    finish: 'Zakończ',
    transfer: 'Przekaż',
    
    // Phone call related
    reachable: 'Dostępny',
    unreachable: 'Niedostępny',
    callResult: 'Wynik połączenia',
    
    // Assignment related
    assigned: 'Przypisane',
    unassigned: 'Nieprzypisane',
    assignedTo: 'Przypisane do: {name}',
    assigningInProgress: 'Przypisuję...',
    verifyingAssignment: 'Weryfikuję przypisanie...',
    assignmentFailed: 'Błąd przypisania - spróbuj ponownie za chwilę',

    // Account Settings
    manageProfile: 'Zarządzaj swoim profilem i hasłem',
    profile: 'Profil',
    password: 'Hasło',
    language: 'Język',
    backToApp: 'Powrót do aplikacji',
    loggedInAs: 'Zalogowany jako',
    fullName: 'Imię i nazwisko',
    emailAddress: 'Adres e-mail',
    emailCannotBeChanged: 'Adres e-mail nie może być zmieniony. Skontaktuj się z administratorem jeśli potrzebujesz zmiany.',
    updateProfile: 'Zaktualizuj profil',
    updating: 'Aktualizowanie...',
    newPassword: 'Nowe hasło',
    confirmPassword: 'Potwierdź nowe hasło',
    changePassword: 'Zmień hasło',
    changing: 'Zmienianie...',
    passwordsDoNotMatch: 'Nowe hasła nie są identyczne',
    passwordTooShort: 'Nowe hasło musi mieć co najmniej 6 znaków',
    profileUpdatedSuccess: 'Profil został zaktualizowany pomyślnie!',
    passwordChangedSuccess: 'Hasło zostało zmienione pomyślnie!',
    logOut: 'Wyloguj',
    endSession: 'Zakończ sesję i wróć do strony logowania',
    languagePreferences: 'Preferencje językowe',
    selectLanguageInterface: 'Wybierz język interfejsu aplikacji. Zmiana zostanie zastosowana natychmiast.',
    changeAppliedImmediately: 'Zmiana zostanie zastosowana natychmiast',
    active: 'Aktywny',
    polish: 'Polski',
    german: 'Deutsch',
    polishLanguage: 'Język polski',
    germanLanguage: 'Deutsche Sprache',
    languageInfo: 'Twoje preferencje językowe są zapisywane w profilu użytkownika i będą zapamiętane przy następnym logowaniu.',
    languageChangedSuccess: 'Język został zmieniony pomyślnie!',
    failedToChangeLanguage: 'Nie udało się zmienić języka. Spróbuj ponownie.',
    
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