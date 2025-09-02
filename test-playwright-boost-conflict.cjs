const { chromium } = require('playwright');

/**
 * PROSTY TEST BOOST/REFRESH KONFLIKTU - PLAYWRIGHT
 * 
 * 1. Zaloguj użytkownika
 * 2. Sprawdź nazwisko w pierwszym tasku (div.flex-1)
 * 3. Kliknij boost na drugim tasku 
 * 4. Sprawdź nazwisko w pierwszym tasku (powinno się zmienić)
 * 5. Przejdź na inną zakładkę na 3 sekundy
 * 6. Wróć i sprawdź nazwisko w pierwszym tasku
 * 7. Wyciągnij wnioski
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

async function testBoostConflict() {
  console.log('🚀 Uruchamianie prostego testu boost/refresh konfliktu (Playwright)...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  const page = await browser.newPage();
  
  try {
    // 1. ZALOGUJ UŻYTKOWNIKA
    console.log('🔐 Logowanie...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    await page.waitForTimeout(5000); // Czekaj aż wszystko się załaduje
    console.log('✅ Zalogowany');
    
    // 2. SPRAWDŹ NAZWISKO W PIERWSZYM TASKU
    console.log('📋 Sprawdzanie początkowego stanu...');
    const initialTask = await page.textContent('div.flex-1 h3');
    
    if (!initialTask) {
      throw new Error('❌ Nie można odczytać nazwy pierwszego taska');
    }
    
    console.log(`📍 Pierwszy task na początku: "${initialTask}"`);
    
    // 2.1 Sprawdź dostępne taski w upcoming list
    const upcomingTasks = await page.$$eval('div.space-y-3 h4', elements => 
      elements.map(el => el.textContent?.trim())
    );
    
    console.log(`📋 Dostępne upcoming tasks (${upcomingTasks.length}):`, upcomingTasks.slice(0, 3));
    
    if (upcomingTasks.length === 0) {
      throw new Error('❌ Brak upcoming tasks do boost');
    }
    
    // 3. KLIKNIJ BOOST NA PIERWSZYM UPCOMING TASKU
    console.log('🚀 Szukanie boost button dla pierwszego upcoming taska...');
    
    // Znajdź pierwszy container z upcoming taskiem i jego boost button
    const firstTaskContainer = await page.locator('div.space-y-3 > div').first();
    const boostButton = firstTaskContainer.locator('button[title="Przenieś zadanie na pierwszą pozycję"]');
    
    // Sprawdź czy button istnieje
    const buttonExists = await boostButton.count() > 0;
    if (!buttonExists) {
      throw new Error('❌ Nie znaleziono boost button dla pierwszego upcoming taska');
    }
    
    // Sprawdź jaki task będziemy boostować
    const taskToBoost = upcomingTasks[0];
    console.log(`🎯 Będę boostować task: "${taskToBoost}"`);
    
    await boostButton.click();
    console.log('✅ Boost button kliknięty');
    
    // 4. CZEKAJ I SPRAWDŹ NAZWISKO PO BOOST
    console.log('⏳ Czekanie na zmianę taska po boost...');
    await page.waitForTimeout(3000); // Więcej czasu na boost
    
    const taskAfterBoost = await page.textContent('div.flex-1 h3');
    console.log(`📍 Pierwszy task po boost: "${taskAfterBoost}"`);
    
    const boostWorked = taskAfterBoost === taskToBoost;
    console.log(`🔍 Boost działał: ${boostWorked ? '✅ TAK' : '❌ NIE'}`);
    
    if (!boostWorked) {
      console.log(`⚠️ Boost nie zadziałał. Oczekiwano: "${taskToBoost}", otrzymano: "${taskAfterBoost}"`);
      console.log('Możliwe przyczyny: timing, boost protection, błędny selector');
    }
    
    // 5. PRZEJDŹ NA INNĄ ZAKŁADKĘ NA 3 SEKUNDY
    console.log('🔄 Symulowanie zmiany zakładki...');
    
    // Ukryj zakładkę przez visibility API
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Zakładka ukryta');
    await page.waitForTimeout(3000); // 3 sekundy na innej zakładce
    
    // Pokaż zakładkę
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Zakładka widoczna - powrót');
    
    // 6. CZEKAJ NA REFRESH I SPRAWDŹ NAZWISKO
    await page.waitForTimeout(4000); // Więcej czasu na refresh po powrocie
    
    const taskAfterTabSwitch = await page.textContent('div.flex-1 h3');
    console.log(`📍 Pierwszy task po powrocie z zakładki: "${taskAfterTabSwitch}"`);
    
    // 7. WYCIĄGNIJ WNIOSKI
    console.log('\n🔍 === SZCZEGÓŁOWA ANALIZA ===');
    console.log(`Początkowy task:        "${initialTask}"`);
    console.log(`Task do boost:          "${taskToBoost}"`);
    console.log(`Po boost:               "${taskAfterBoost}"`);
    console.log(`Po powrocie z zakładki: "${taskAfterTabSwitch}"`);
    
    const boostSucceeded = taskAfterBoost === taskToBoost;
    const boostRevertedByRefresh = boostSucceeded && taskAfterTabSwitch !== taskToBoost;
    const boostPersisted = boostSucceeded && taskAfterTabSwitch === taskToBoost;
    
    console.log(`\n📊 Boost zadziałał:                    ${boostSucceeded ? '✅ TAK' : '❌ NIE'}`);
    console.log(`📊 Boost został cofnięty przez refresh: ${boostRevertedByRefresh ? '🚨 TAK' : '✅ NIE'}`);
    console.log(`📊 Boost się utrzymał:                 ${boostPersisted ? '✅ TAK' : '❌ NIE'}`);
    
    if (boostRevertedByRefresh) {
      console.log('\n🚨 KONFLIKT WYKRYTY!');
      console.log(`Problem: Task "${taskToBoost}" został przeniesiony na pierwszą pozycję,`);
      console.log('ale po powrocie z zakładki został cofnięty przez refresh!');
      return 'CONFLICT_DETECTED';
    } else if (boostPersisted) {
      console.log('\n✅ BRAK KONFLIKTU');
      console.log('Boost zadziałał i się utrzymał mimo zmiany zakładki');
      return 'NO_CONFLICT';
    } else if (!boostSucceeded) {
      console.log('\n⚠️ BOOST NIE ZADZIAŁAŁ');
      console.log('Boost button nie spowodował zmiany pierwszego taska');
      console.log('To może być problem z timing, selektorami lub logiką boost');
      return 'BOOST_FAILED';
    } else {
      console.log('\n❓ NIEOCZEKIWANE ZACHOWANIE');
      console.log('Boost zadziałał ale końcowy wynik jest niespodziewany');
      return 'UNEXPECTED_BEHAVIOR';
    }
    
  } catch (error) {
    console.error('❌ Test błąd:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Uruchom test
testBoostConflict()
  .then(result => {
    console.log('\n🎯 === KOŃCOWY WYNIK ===');
    switch(result) {
      case 'CONFLICT_DETECTED':
        console.log('🚨 KONFLIKT BOOST/REFRESH POTWIERDZONY');
        console.log('Potrzebne jest rozwiązanie problemu z boost protection');
        process.exit(1);
        break;
      case 'NO_CONFLICT':
        console.log('✅ BRAK KONFLIKTU - SYSTEM DZIAŁA POPRAWNIE');
        console.log('Boost protection skutecznie chroni przed konfliktami');
        process.exit(0);
        break;
      case 'BOOST_FAILED':
        console.log('⚠️ PROBLEM Z BOOST OPERATION');
        console.log('Boost nie działa - trzeba zbadać przyczyny');
        process.exit(2);
        break;
      default:
        console.log('❓ WYNIK NIEOKREŚLONY');
        console.log('Trzeba zbadać szczegółowo co się dzieje');
        process.exit(3);
    }
  })
  .catch(error => {
    console.error('💥 Test całkowicie nieudany:', error);
    process.exit(1);
  });