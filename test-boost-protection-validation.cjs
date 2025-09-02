const puppeteer = require('puppeteer');

/**
 * BOOST PROTECTION VALIDATION TEST
 * 
 * Tests the new Boost Protection System to ensure it prevents
 * visibility refresh from overwriting boost operations.
 * 
 * Expected Behavior:
 * 1. Boost operation starts → Boost protection activates
 * 2. Tab visibility change occurs → Refresh is queued, not executed
 * 3. Boost operation completes → Protection ends, queued refresh executes
 * 4. Boosted task remains in focused position ✅
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

class BoostProtectionValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleMessages = [];
    this.boostStates = [];
  }

  async initialize() {
    console.log('🛡️ Initializing Boost Protection Validation...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false,
      slowMo: 200,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1400, height: 900 });
    
    // Monitor console for boost protection messages
    this.page.on('console', (msg) => {
      const message = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text()
      };
      
      this.consoleMessages.push(message);
      
      // Highlight boost protection messages
      if (msg.text().includes('🛡️') || msg.text().includes('boost') || 
          msg.text().includes('protection') || msg.text().includes('queued')) {
        console.log(`🔍 [${message.timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    console.log('✅ Boost Protection Validator initialized');
  }

  async login() {
    console.log('🔐 Attempting login...');
    
    await this.page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if already logged in
    const isLoggedIn = await this.page.$('[data-testid="task-focused-view"]');
    if (isLoggedIn) {
      console.log('✅ Already logged in');
      return;
    }

    // Login process
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await this.page.type('input[type="email"]', TEST_EMAIL);
    await this.page.type('input[type="password"]', TEST_PASSWORD);
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    
    console.log('✅ Login successful');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async waitForApp() {
    console.log('⏳ Waiting for app to load...');
    
    await this.page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 10000 });
    await this.page.waitForSelector('[data-testid="manual-refresh-button"]', { timeout: 5000 });
    
    // Wait for boost buttons
    const boostButtons = await this.page.$$('button[title*="pozycję"]');
    if (boostButtons.length === 0) {
      throw new Error('❌ No boost buttons found');
    }
    
    console.log(`✅ Found ${boostButtons.length} boost buttons`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async captureState(phase) {
    const state = await this.page.evaluate(() => {
      // Get focused task name
      const focusedTask = document.querySelector('[data-testid="task-focused-view"] h3')?.textContent;
      
      // Get boost protection indicator - simpler approach
      const boostProtectionText = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('Boost Active')
      );
      const isBoostProtectionActive = boostProtectionText !== undefined;
      const queuedCount = boostProtectionText?.textContent?.match(/\\((\\d+) queued\\)/)?.[1] || '0';
      
      return {
        timestamp: new Date().toISOString(),
        focusedTask,
        isBoostProtectionActive,
        queuedRefreshCount: parseInt(queuedCount),
        lastUpdate: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent
      };
    });
    
    this.boostStates.push({ phase, ...state });
    console.log(`📸 ${phase}: "${state.focusedTask}" | Protection: ${state.isBoostProtectionActive} | Queued: ${state.queuedRefreshCount}`);
    return state;
  }

  async executeBoostWithProtection() {
    console.log('\n🛡️ === TESTING BOOST PROTECTION SYSTEM ===');
    
    // Capture initial state
    await this.captureState('initial');
    
    // Find and click boost button
    console.log('🎯 Clicking boost button...');
    const alertBoostBtn = await this.page.$('button[title="Przenieś zadanie na pierwszą pozycję"]');
    if (!alertBoostBtn) {
      throw new Error('❌ Alert boost button not found');
    }
    
    await alertBoostBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for boost to start
    
    // Capture during-boost state (should show protection active)
    const duringBoostState = await this.captureState('during-boost');
    
    // CRITICAL MOMENT: Trigger tab visibility change during boost
    console.log('👁️ Simulating tab visibility change (should be protected)...');
    await this.page.evaluate(() => {
      // Simulate tab visibility change
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.page.evaluate(() => {
      // Bring tab back to visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    console.log('📱 Visibility change complete');
    
    // Capture immediately after visibility change
    const duringProtectionState = await this.captureState('during-protection');
    
    // Wait for boost to complete and protection to end
    console.log('⏳ Waiting for boost completion...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capture final state
    const finalState = await this.captureState('final');
    
    return {
      initialTask: this.boostStates[0]?.focusedTask,
      expectedBoostedTask: this.getExpectedBoostedTask(),
      duringBoostProtection: duringProtectionState.isBoostProtectionActive,
      finalFocusedTask: finalState.focusedTask,
      protectionWorked: this.analyzeProtectionEffectiveness()
    };
  }

  getExpectedBoostedTask() {
    // This is a simplified approach - in real test we'd capture this from the upcoming tasks list
    return this.boostStates.find(s => s.phase === 'during-boost')?.focusedTask;
  }

  analyzeProtectionEffectiveness() {
    const initial = this.boostStates.find(s => s.phase === 'initial');
    const duringBoost = this.boostStates.find(s => s.phase === 'during-boost');
    const duringProtection = this.boostStates.find(s => s.phase === 'during-protection');
    const final = this.boostStates.find(s => s.phase === 'final');
    
    if (!duringBoost || !final) return false;
    
    // Check if boosted task was preserved through visibility refresh
    const boostSucceeded = duringBoost.focusedTask !== initial?.focusedTask;
    const boostPreserved = final.focusedTask === duringBoost.focusedTask;
    const protectionActive = duringProtection?.isBoostProtectionActive;
    
    return {
      boostSucceeded,
      boostPreserved,
      protectionActive,
      overall: boostSucceeded && boostPreserved && protectionActive
    };
  }

  async runValidationTest() {
    console.log('🎯 Running Boost Protection Validation Test...');
    
    try {
      await this.initialize();
      await this.login();
      await this.waitForApp();
      
      const results = await this.executeBoostWithProtection();
      
      console.log('\n📊 BOOST PROTECTION TEST RESULTS:');
      console.log('================================');
      console.log(`Initial Task: "${results.initialTask}"`);
      console.log(`Expected Boosted Task: "${results.expectedBoostedTask}"`);
      console.log(`Final Focused Task: "${results.finalFocusedTask}"`);
      console.log(`Protection Active During Visibility Change: ${results.duringBoostProtection}`);
      
      const effectiveness = results.protectionWorked;
      console.log(`\n🛡️ PROTECTION EFFECTIVENESS:`);
      console.log(`  Boost Succeeded: ${effectiveness.boostSucceeded ? '✅' : '❌'}`);
      console.log(`  Boost Preserved: ${effectiveness.boostPreserved ? '✅' : '❌'}`);
      console.log(`  Protection Active: ${effectiveness.protectionActive ? '✅' : '❌'}`);
      console.log(`  Overall Success: ${effectiveness.overall ? '✅' : '❌'}`);
      
      console.log('\n📋 STATE TIMELINE:');
      this.boostStates.forEach((state, index) => {
        const indicator = state.isBoostProtectionActive ? '🛡️' : '  ';
        console.log(`${index + 1}. ${indicator} [${state.timestamp}] ${state.phase}: "${state.focusedTask}"`);
      });
      
      console.log('\n🔍 BOOST PROTECTION CONSOLE LOGS:');
      const protectionLogs = this.consoleMessages.filter(msg => 
        msg.text.includes('🛡️') || msg.text.includes('protection') || 
        msg.text.includes('queued') || msg.text.includes('boost')
      );
      
      protectionLogs.slice(-10).forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.text}`);
      });
      
      if (effectiveness.overall) {
        console.log('\n🎉 BOOST PROTECTION SYSTEM WORKING CORRECTLY!');
        return { success: true, results };
      } else {
        console.log('\n❌ BOOST PROTECTION SYSTEM NEEDS DEBUGGING');
        return { success: false, results };
      }
      
    } catch (error) {
      console.error('💥 Test failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      if (this.browser) {
        console.log('🧹 Cleaning up...');
        await this.browser.close();
      }
    }
  }
}

// Run validation test
async function runBoostProtectionValidation() {
  const validator = new BoostProtectionValidator();
  
  try {
    const result = await validator.runValidationTest();
    
    if (result.success) {
      console.log('\n✅ Boost Protection System validated successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Boost Protection System validation failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBoostProtectionValidation();
}

module.exports = { BoostProtectionValidator };