const { chromium } = require('playwright');

/**
 * DEFINITYWNY TEST BOOST/REFRESH KONFLIKTU - PLAYWRIGHT
 * 
 * Ten test został stworzony po długim procesie debugowania i potwierdza
 * istnienie rzeczywistego problemu z boost/refresh conflict w aplikacji Sunshine.
 * 
 * FLOW TESTU:
 * 1. Logowanie użytkownika do aplikacji
 * 2. Odczytanie nazwy aktualnie fokusowanego taska (div.flex-1 h3)
 * 3. Kliknięcie boost button dla pierwszego upcoming taska
 * 4. Weryfikacja że boost zadziałał (task moved to first position)
 * 5. Symulacja zmiany zakładki (visibilitychange events)
 * 6. Powrót do zakładki i weryfikacja czy boost się utrzymał
 * 7. Analiza wyników i określenie czy konflikt występuje
 * 
 * WYNIKI TESTÓW:
 * - CONFLICT_DETECTED: Boost zadziałał ale został cofnięty przez refresh
 * - NO_CONFLICT: Boost zadziałał i się utrzymał
 * - BOOST_FAILED: Boost w ogóle nie zadziałał
 * - UNEXPECTED_BEHAVIOR: Nieokreślony wynik
 * 
 * OSTATNI PRZEBIEG:
 * ✅ Boost zadziałał: TAK - "Ania Lewandowska" przeniesiona na #1
 * 🚨 Boost został cofnięty przez refresh: TAK - powrót do "Irena Buziak"
 * 
 * WNIOSEK: KONFLIKT BOOST/REFRESH POTWIERDZONY
 * Problem występuje gdy użytkownik przełącza zakładki po wykonaniu boost operation.
 * Visibility refresh pobiera stale dane z Airtable i nadpisuje wynik boost.
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

async function testBoostConflict() {
  console.log('🚀 DEFINITYWNY TEST BOOST/REFRESH KONFLIKTU (Playwright)');
  console.log('📅 Data: ' + new Date().toISOString());
  console.log('🔗 URL: ' + APP_URL);
  console.log('👤 User: ' + TEST_EMAIL);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  const page = await browser.newPage();
  
  try {
    // 1. LOGOWANIE
    console.log('🔐 Krok 1: Logowanie użytkownika...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    await page.waitForTimeout(5000); // Stabilizacja po logowaniu
    console.log('✅ Użytkownik zalogowany pomyślnie');
    
    // 2. ODCZYT POCZĄTKOWEGO STANU
    console.log('\n📋 Krok 2: Analiza początkowego stanu...');
    const initialTask = await page.textContent('div.flex-1 h3');
    
    if (!initialTask) {
      throw new Error('❌ Błąd: Nie można odczytać nazwy fokusowanego taska');
    }
    
    console.log(`📍 Aktualnie fokusowany task: "${initialTask}"`);
    
    // Odczyt listy upcoming tasks
    const upcomingTasks = await page.$$eval('div.space-y-3 h4', elements => 
      elements.map(el => el.textContent?.trim()).filter(Boolean)
    );
    
    console.log(`📋 Liczba upcoming tasks: ${upcomingTasks.length}`);
    if (upcomingTasks.length > 0) {
      console.log(`📋 Pierwsze 3 upcoming tasks:`, upcomingTasks.slice(0, 3));
    }
    
    if (upcomingTasks.length === 0) {
      throw new Error('❌ Błąd: Brak dostępnych upcoming tasks do boost');
    }
    
    // 3. WYKONANIE BOOST OPERATION
    console.log('\n🚀 Krok 3: Wykonywanie boost operation...');
    
    // Lokalizacja boost button dla pierwszego upcoming taska
    const firstTaskContainer = page.locator('div.space-y-3 > div').first();
    const boostButton = firstTaskContainer.locator('button[title="Przenieś zadanie na pierwszą pozycję"]');
    
    const buttonExists = await boostButton.count() > 0;
    if (!buttonExists) {
      throw new Error('❌ Błąd: Boost button nie został znaleziony');
    }
    
    const taskToBoost = upcomingTasks[0];
    console.log(`🎯 Task wybrany do boost: "${taskToBoost}"`);
    
    await boostButton.click();
    console.log('✅ Boost button kliknięty');
    
    // 4. WERYFIKACJA BOOST RESULT
    console.log('\n⏳ Krok 4: Weryfikacja wyniku boost...');
    await page.waitForTimeout(3000); // Czas na propagację boost
    
    const taskAfterBoost = await page.textContent('div.flex-1 h3');
    console.log(`📍 Fokusowany task po boost: "${taskAfterBoost}"`);
    
    const boostSucceeded = taskAfterBoost === taskToBoost;
    console.log(`🔍 Status boost operation: ${boostSucceeded ? '✅ SUKCES' : '❌ NIEPOWODZENIE'}`);
    
    if (!boostSucceeded) {
      console.log(`⚠️ Boost nie zadziałał zgodnie z oczekiwaniami:`);
      console.log(`   Oczekiwany: "${taskToBoost}"`);
      console.log(`   Rzeczywisty: "${taskAfterBoost}"`);
    }
    
    // 5. SYMULACJA ZMIANY ZAKŁADKI
    console.log('\n🔄 Krok 5: Symulacja zmiany zakładki...');
    
    // Ukrycie zakładki (visibilitychange: visible → hidden)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Zakładka ukryta (visibilityState: hidden)');
    await page.waitForTimeout(3000); // 3 sekundy na "innej zakładce"
    
    // Pokazanie zakładki (visibilitychange: hidden → visible)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Powrót do zakładki (visibilityState: visible)');
    
    // 6. WERYFIKACJA STANU PO REFRESH
    console.log('\n🔍 Krok 6: Analiza stanu po powrocie...');
    await page.waitForTimeout(4000); // Czas na visibility refresh
    
    const taskAfterTabSwitch = await page.textContent('div.flex-1 h3');
    console.log(`📍 Fokusowany task po powrocie: "${taskAfterTabSwitch}"`);
    
    // 7. SZCZEGÓŁOWA ANALIZA WYNIKÓW
    console.log('\n📊 === SZCZEGÓŁOWA ANALIZA WYNIKÓW ===');
    console.log(`Początkowy fokusowany task:    "${initialTask}"`);
    console.log(`Task wybrany do boost:         "${taskToBoost}"`);
    console.log(`Task po wykonaniu boost:       "${taskAfterBoost}"`);
    console.log(`Task po powrocie z zakładki:   "${taskAfterTabSwitch}"`);
    console.log('');
    
    const boostWorked = taskAfterBoost === taskToBoost;
    const boostReverted = boostWorked && taskAfterTabSwitch !== taskToBoost;
    const boostPersisted = boostWorked && taskAfterTabSwitch === taskToBoost;
    
    console.log(`📈 Boost operation succeeded:     ${boostWorked ? '✅ TAK' : '❌ NIE'}`);
    console.log(`📉 Boost reverted by refresh:     ${boostReverted ? '🚨 TAK' : '✅ NIE'}`);
    console.log(`📌 Boost persisted after refresh: ${boostPersisted ? '✅ TAK' : '❌ NIE'}`);
    
    // Określenie końcowego wyniku
    let result;
    let resultDescription;
    
    if (boostReverted) {
      result = 'CONFLICT_DETECTED';
      resultDescription = `Task "${taskToBoost}" został pomyślnie przeniesiony na pierwszą pozycję, ale po powrocie z zakładki został cofnięty przez visibility refresh. To potwierdza istnienie boost/refresh conflict.`;
    } else if (boostPersisted) {
      result = 'NO_CONFLICT';
      resultDescription = `Task "${taskToBoost}" został przeniesiony na pierwszą pozycję i utrzymał się po powrocie z zakładki. Boost protection działa poprawnie.`;
    } else if (!boostWorked) {
      result = 'BOOST_FAILED';
      resultDescription = `Boost operation nie powiodła się - task nie został przeniesiony na pierwszą pozycję. Problem może być związany z timing, selektorami lub logiką boost.`;
    } else {
      result = 'UNEXPECTED_BEHAVIOR';
      resultDescription = `Boost zadziałał, ale końcowy stan jest nieoczekiwany. Wymaga dalszej analizy.`;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 WYNIK TESTU: ${result}`);
    console.log('='.repeat(60));
    console.log(resultDescription);
    console.log('='.repeat(60));
    
    return result;
    
  } catch (error) {
    console.error('\n❌ BŁĄD TESTU:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await browser.close();
  }
}

// GŁÓWNA FUNKCJA URUCHOMIENIOWA
async function main() {
  try {
    const result = await testBoostConflict();
    
    console.log('\n🏁 === PODSUMOWANIE TESTU ===');
    console.log('Data wykonania:', new Date().toISOString());
    console.log('Wynik:', result);
    
    switch(result) {
      case 'CONFLICT_DETECTED':
        console.log('');
        console.log('🚨 KONFLIKT BOOST/REFRESH POTWIERDZONY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Problem wymaga implementacji rozwiązania:');
        console.log('• Extended Protection Time (najprostsze)');
        console.log('• Verification-Based Protection (najbardziej niezawodne)');
        console.log('• Smart Refresh Filtering (chirurgiczne)');
        console.log('');
        process.exit(1);
        
      case 'NO_CONFLICT':
        console.log('');
        console.log('✅ SYSTEM DZIAŁA POPRAWNIE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Boost protection skutecznie chroni przed konfliktami.');
        console.log('Brak potrzeby dodatkowych zmian.');
        console.log('');
        process.exit(0);
        
      case 'BOOST_FAILED':
        console.log('');
        console.log('⚠️ PROBLEM Z BOOST OPERATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Boost nie działa poprawnie. Wymagana analiza:');
        console.log('• Sprawdzenie timing boost operation');
        console.log('• Weryfikacja selektorów DOM');
        console.log('• Analiza logiki boost w useTaskActions');
        console.log('');
        process.exit(2);
        
      default:
        console.log('');
        console.log('❓ WYNIK NIEOKREŚLONY');
        console.log('━━━━━━━━━━━━━━━━━━━━━');
        console.log('Test wykazał nieoczekiwane zachowanie.');
        console.log('Wymagana szczegółowa analiza przypadku.');
        console.log('');
        process.exit(3);
    }
    
  } catch (error) {
    console.error('\n💥 CAŁKOWITA AWARIA TESTU');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Błąd:', error.message);
    console.error('');
    console.error('Możliwe przyczyny:');
    console.error('• Server nie działa (http://localhost:5173)');
    console.error('• Błędne credentials testowe');
    console.error('• Zmiany w strukturze DOM aplikacji');
    console.error('• Problem z Playwright/przeglądarką');
    console.error('');
    process.exit(1);
  }
}

// Uruchomienie testu
if (require.main === module) {
  main();
}

module.exports = { testBoostConflict };