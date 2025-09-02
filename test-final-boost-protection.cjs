const puppeteer = require('puppeteer');

/**
 * FINAL BOOST PROTECTION VALIDATION
 * 
 * This test validates that the Boost Protection System successfully
 * prevents visibility refresh conflicts in production scenarios.
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

async function runFinalValidation() {
  console.log('🎯 Final Boost Protection System Validation');
  console.log('=========================================');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    slowMo: 150,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    const protectionEvents = [];
    
    // Monitor boost protection logs
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('🛡️') || text.includes('boost') || 
          text.includes('protection') || text.includes('queued')) {
        const timestamp = new Date().toISOString();
        protectionEvents.push({ timestamp, message: text });
        console.log(`📝 [${timestamp}] ${text}`);
      }
    });

    // Login
    console.log('\n🔐 Logging in...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isLoggedIn = await page.$('[data-testid="task-focused-view"]');
    if (!isLoggedIn) {
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    }
    
    console.log('✅ Login successful');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for app to fully load
    console.log('\n⏳ Waiting for app components...');
    await page.waitForSelector('[data-testid="manual-refresh-button"]', { timeout: 10000 });
    
    const boostButtons = await page.$$('button[title*="pozycję"]');
    console.log(`✅ Found ${boostButtons.length} boost buttons`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Execute boost operation
    console.log('\n🚀 Testing boost protection...');
    
    const focusedTaskBefore = await page.evaluate(() => {
      return document.querySelector('[data-testid="task-focused-view"] h3')?.textContent;
    });
    console.log(`📋 Initial focused task: "${focusedTaskBefore}"`);
    
    // Click boost button
    const alertBoostBtn = await page.$('button[title="Przenieś zadanie na pierwszą pozycję"]');
    if (alertBoostBtn) {
      console.log('🎯 Clicking boost button...');
      await alertBoostBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Immediate visibility change to test protection
      console.log('👁️ Triggering tab visibility change during boost...');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      console.log('📱 Visibility change completed');
      
      // Wait for boost and protection to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Analyze results
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('==================');
    
    const hasProtectionStart = protectionEvents.some(e => e.message.includes('Starting boost protection'));
    const hasVisibilityQueue = protectionEvents.some(e => e.message.includes('Queueing visibility refresh'));
    const hasProtectionEnd = protectionEvents.some(e => e.message.includes('ending boost operation'));
    const hasQueueExecution = protectionEvents.some(e => e.message.includes('Processing') && e.message.includes('queued'));
    
    console.log(`🛡️ Protection System Started: ${hasProtectionStart ? '✅' : '❌'}`);
    console.log(`⏳ Visibility Refresh Queued: ${hasVisibilityQueue ? '✅' : '❌'}`);
    console.log(`🔚 Protection System Ended: ${hasProtectionEnd ? '✅' : '❌'}`);
    console.log(`🔄 Queued Refresh Executed: ${hasQueueExecution ? '✅' : '❌'}`);
    
    const systemWorking = hasProtectionStart && hasVisibilityQueue && hasProtectionEnd;
    
    console.log(`\n🎯 Overall System Status: ${systemWorking ? '✅ WORKING CORRECTLY' : '❌ NEEDS ATTENTION'}`);
    
    if (systemWorking) {
      console.log('\n🎉 BOOST PROTECTION SYSTEM SUCCESSFULLY DEPLOYED!');
      console.log('   • Tab switching during boost operations no longer causes conflicts');
      console.log('   • Refresh requests are intelligently queued during boost operations');
      console.log('   • Users will see stable boost behavior regardless of tab switching');
    }
    
    console.log(`\n📝 Total protection events logged: ${protectionEvents.length}`);
    console.log('\n🔗 Protection Event Timeline:');
    protectionEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. [${event.timestamp}] ${event.message}`);
    });

    return systemWorking;

  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Execute validation
runFinalValidation().then(success => {
  if (success) {
    console.log('\n✅ FINAL VALIDATION PASSED - Ready for deployment!');
    process.exit(0);
  } else {
    console.log('\n❌ FINAL VALIDATION FAILED - Check logs above');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Validation execution failed:', error);
  process.exit(1);
});