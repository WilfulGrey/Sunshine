const puppeteer = require('puppeteer');

/**
 * PROSTY TEST BOOST/REFRESH KONFLIKTU
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
  console.log('🚀 Uruchamianie prostego testu boost/refresh konfliktu...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    // 1. ZALOGUJ UŻYTKOWNIKA
    console.log('🔐 Logowanie...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Czekaj aż wszystko się załaduje
    console.log('✅ Zalogowany');
    
    // 2. SPRAWDŹ NAZWISKO W PIERWSZYM TASKU
    console.log('📋 Sprawdzanie początkowego stanu...');
    const initialTask = await page.evaluate(() => {
      const focusedElement = document.querySelector('div.flex-1 h3');
      return focusedElement?.textContent?.trim() || null;
    });
    
    if (!initialTask) {
      throw new Error('❌ Nie można odczytać nazwy pierwszego taska');
    }
    
    console.log(`📍 Pierwszy task na początku: "${initialTask}"`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. KLIKNIJ BOOST NA DRUGIM TASKU
    console.log('🚀 Klikanie boost button...');
    const boostButton = await page.waitForSelector('button[title="Przenieś zadanie na pierwszą pozycję"]', { timeout: 5000 });
    if (!boostButton) {
      throw new Error('❌ Nie znaleziono boost button');
    }
    
    await boostButton.click();
    console.log('✅ Boost button kliknięty');
    
    // 4. CZEKAJ I SPRAWDŹ NAZWISKO PO BOOST (z timeoutem)
    console.log('⏳ Czekanie na zmianę taska po boost...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Czas na wykonanie boost
    
    const taskAfterBoost = await page.evaluate(() => {
      const focusedElement = document.querySelector('div.flex-1 h3');
      return focusedElement?.textContent?.trim() || null;
    });
    
    console.log(`📍 Pierwszy task po boost: "${taskAfterBoost}"`);
    
    const boostWorked = initialTask !== taskAfterBoost;
    console.log(`🔍 Boost działał: ${boostWorked ? '✅ TAK' : '❌ NIE'}`);
    
    // 5. PRZEJDŹ NA INNĄ ZAKŁADKĘ NA 3 SEKUNDY
    console.log('🔄 Symulowanie zmiany zakładki...');
    
    // Ukryj zakładkę
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Zakładka ukryta');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sekundy na innej zakładce
    
    // Pokaż zakładkę
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('👁️ Zakładka widoczna - powrót');
    
    // 6. CZEKAJ NA REFRESH I SPRAWDŹ NAZWISKO
    await new Promise(resolve => setTimeout(resolve, 3000)); // Czas na refresh po powrocie
    
    const taskAfterTabSwitch = await page.evaluate(() => {
      const focusedElement = document.querySelector('div.flex-1 h3');
      return focusedElement?.textContent?.trim() || null;
    });
    
    console.log(`📍 Pierwszy task po powrocie z zakładki: "${taskAfterTabSwitch}"`);
    
    // 7. WYCIĄGNIJ WNIOSKI
    console.log('\n🔍 === ANALIZA REZULTATÓW ===');
    console.log(`Początkowy task: "${initialTask}"`);
    console.log(`Po boost: "${taskAfterBoost}"`);
    console.log(`Po powrocie z zakładki: "${taskAfterTabSwitch}"`);
    
    const boostSucceeded = initialTask !== taskAfterBoost;
    const boostRevertedByRefresh = boostSucceeded && taskAfterTabSwitch === initialTask;
    const boostPersisted = boostSucceeded && taskAfterBoost === taskAfterTabSwitch;
    
    console.log(`\n📊 Boost zadziałał: ${boostSucceeded ? '✅' : '❌'}`);
    console.log(`📊 Boost został cofnięty przez refresh: ${boostRevertedByRefresh ? '🚨 TAK' : '✅ NIE'}`);
    console.log(`📊 Boost się utrzymał: ${boostPersisted ? '✅ TAK' : '❌ NIE'}`);
    
    if (boostRevertedByRefresh) {
      console.log('\n🚨 KONFLIKT WYKRYTY!');
      console.log('Problem: Boost zadziałał ale został cofnięty przez refresh po zmianie zakładki');
      return false;
    } else if (boostPersisted) {
      console.log('\n✅ BRAK KONFLIKTU');
      console.log('Boost zadziałał i się utrzymał mimo zmiany zakładki');
      return true;
    } else if (!boostSucceeded) {
      console.log('\n⚠️ BOOST NIE ZADZIAŁAŁ');
      console.log('Boost button nie spowodował zmiany pierwszego taska');
      return null;
    } else {
      console.log('\n❓ NIEOKREŚLONY WYNIK');
      console.log('Nietypowe zachowanie - boost zadziałał ale wynik po refresh jest inny niż oczekiwany');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Uruchom test
testBoostConflict()
  .then(result => {
    if (result === false) {
      console.log('\n🎯 WNIOSEK: Konflikt boost/refresh ISTNIEJE - trzeba naprawić');
      process.exit(1);
    } else if (result === true) {
      console.log('\n🎯 WNIOSEK: Konflikt boost/refresh NIE ISTNIEJE - system działa poprawnie');
      process.exit(0);
    } else {
      console.log('\n🎯 WNIOSEK: Test nieokreślony - trzeba zbadać dalej');
      process.exit(2);
    }
  })
  .catch(error => {
    console.error('💥 Test błąd:', error);
    process.exit(1);
  });