/**
 * CONSOLE ANALYSIS SCRIPT - Evidence-based debugging as per CLAUDE.md
 * Tests Smart Refresh implementation with real browser behavior
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 STARTING CONSOLE ANALYSIS FOR SMART REFRESH');
  console.log('================================================');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Console monitoring arrays
  let consoleLogs = [];
  let consoleErrors = [];
  let networkErrors = [];
  let smartRefreshEvents = [];
  
  // Monitor all console activity
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
      location: msg.location()
    };
    
    consoleLogs.push(logEntry);
    
    if (msg.type() === 'error') {
      consoleErrors.push(logEntry);
    }
    
    // Track smart refresh specific events
    if (msg.text().includes('activity') || 
        msg.text().includes('visibility') ||
        msg.text().includes('polling') ||
        msg.text().includes('refresh')) {
      smartRefreshEvents.push(logEntry);
    }
  });
  
  // Monitor network failures
  page.on('response', response => {
    if (!response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push({
      type: 'pageerror',
      text: error.toString(),
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  });
  
  try {
    console.log('🌐 Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔐 Logging in with real credentials...');
    
    // Look for login elements and login
    try {
      // Check if already logged in
      const userElement = await page.$('[data-testid="user-info"]');
      if (userElement) {
        console.log('✅ Already logged in');
      } else {
        // Look for login form inputs directly
        const emailInput = await page.$('input[type="email"]');
        const passwordInput = await page.$('input[type="password"]');
        
        if (emailInput && passwordInput) {
          console.log('🔑 Found login form, filling credentials...');
          
          // Clear and type email
          await emailInput.click({ clickCount: 3 }); // Select all
          await emailInput.type('m.kepinski@mamamia.app');
          console.log('✅ Email entered: m.kepinski@mamamia.app');
          
          // Clear and type password  
          await passwordInput.click({ clickCount: 3 }); // Select all
          await passwordInput.type(process.env.TEST_PASSWORD || '123Qwe123$');
          console.log('✅ Password entered');
          
          // Look for submit button using multiple strategies
          let submitButton = await page.$('button[type="submit"]') || 
                            await page.$('form button');
                            
          // If not found, try to find by text content
          if (!submitButton) {
            const buttons = await page.$$('button');
            for (const button of buttons) {
              const text = await page.evaluate(el => el.textContent, button);
              if (text && (text.includes('Zaloguj') || text.includes('Sign in') || text.includes('Login'))) {
                submitButton = button;
                break;
              }
            }
          }
          
          if (submitButton) {
            console.log('🔑 Clicking login button...');
            await submitButton.click();
            console.log('⏳ Login submitted, waiting for response...');
            
            // Wait for login to complete and redirect/reload
            await new Promise(resolve => setTimeout(resolve, 8000));
          } else {
            console.log('❌ Login button not found');
          }
          
        } else {
          console.log('❌ Login form inputs not found');
          console.log(`Email input found: ${!!emailInput}`);
          console.log(`Password input found: ${!!passwordInput}`);
        }
      }
    } catch (loginError) {
      console.log('⚠️  Login process encountered issues:', loginError.message);
    }
    
    // Wait for tasks to load
    console.log('📋 Waiting for tasks to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🧪 Testing Smart Refresh Integration with real data...');
    
    // Diagnostics: Check current page state
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Check what's actually on the page
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
    console.log(`📝 Page content sample: ${bodyText}...`);
    
    // Check for any visible task-related elements
    const allTestIds = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-testid]'));
      return elements.map(el => el.getAttribute('data-testid'));
    });
    console.log(`🎯 Found test-ids: ${allTestIds.join(', ')}`);
    
    // Test 1: Check if TaskFocusedView loaded with smart refresh controls
    try {
      await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 10000 });
      console.log('✅ TaskFocusedView loaded successfully');
      
      const refreshButton = await page.$('[data-testid="manual-refresh-button"]');
      if (refreshButton) {
        console.log('✅ Manual refresh button found');
      } else {
        console.log('❌ Manual refresh button NOT found');
      }
      
      const timestamp = await page.$('[data-testid="last-update-timestamp"]');
      if (timestamp) {
        console.log('✅ Timestamp display found');
      } else {
        console.log('❌ Timestamp display NOT found');
      }
      
      const indicator = await page.$('[data-testid="auto-refresh-indicator"]');
      if (indicator) {
        console.log('✅ Auto-refresh indicator found');
      } else {
        console.log('❌ Auto-refresh indicator NOT found');
      }
      
    } catch (error) {
      console.log('❌ TaskFocusedView not found:', error.message);
    }
    
    // Test 2: Simulate user activity and monitor smart refresh behavior
    console.log('🎯 Simulating user activity...');
    
    // Generate mouse activity
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.move(300, 300);
    
    // Generate keyboard activity
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    
    // Wait and observe behavior
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Manual refresh interaction
    console.log('🔄 Testing manual refresh...');
    try {
      const refreshButton = await page.$('[data-testid="manual-refresh-button"]');
      if (refreshButton) {
        await refreshButton.click();
        console.log('✅ Manual refresh button clicked');
        
        // Wait for loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if loading state appeared
        const loadingButton = await page.$('[data-testid="manual-refresh-button"]:disabled');
        if (loadingButton) {
          console.log('✅ Loading state detected');
        }
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log('❌ Manual refresh test failed:', error.message);
    }
    
    // Test 4: Performance monitoring
    console.log('📊 Collecting performance metrics...');
    const metrics = await page.metrics();
    
    console.log('==========================================');
    console.log('📋 CONSOLE ANALYSIS RESULTS:');
    console.log('==========================================');
    
    console.log(`📝 Total console logs: ${consoleLogs.length}`);
    console.log(`❌ Console errors: ${consoleErrors.length}`);
    console.log(`🌐 Network errors: ${networkErrors.length}`);
    console.log(`🚀 Smart refresh events: ${smartRefreshEvents.length}`);
    
    // Performance metrics
    console.log(`🧠 JS Heap Size: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⚡ Layout Count: ${metrics.LayoutCount}`);
    console.log(`🎨 Style Recalcs: ${metrics.RecalcStyleCount}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS FOUND:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.timestamp}] ${error.type}: ${error.text}`);
        if (error.location) {
          console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
        }
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 NETWORK ERRORS:');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.status} ${error.statusText}: ${error.url}`);
      });
    }
    
    if (smartRefreshEvents.length > 0) {
      console.log('\n🚀 SMART REFRESH ACTIVITY:');
      smartRefreshEvents.forEach((event, index) => {
        console.log(`${index + 1}. [${event.timestamp}] ${event.type}: ${event.text}`);
      });
    }
    
    // Check smart refresh state from window
    const smartRefreshState = await page.evaluate(() => {
      return window.smartRefreshState || null;
    });
    
    if (smartRefreshState) {
      console.log('\n🎯 SMART REFRESH STATE:');
      console.log(`   Manual Refreshing: ${smartRefreshState.isManualRefreshing}`);
      console.log(`   Last Update: ${new Date(smartRefreshState.lastUpdateTime).toLocaleString()}`);
      if (smartRefreshState.pollingState) {
        console.log(`   Polling Active: ${smartRefreshState.pollingState.isActive}`);
        console.log(`   Error Count: ${smartRefreshState.pollingState.errorCount}`);
        console.log(`   Current Interval: ${smartRefreshState.pollingState.currentInterval}ms`);
      }
    }
    
    // Final assessment
    console.log('\n🎯 SMART REFRESH ASSESSMENT:');
    
    const criticalErrors = consoleErrors.filter(error => 
      error.text.includes('TypeError') || 
      error.text.includes('ReferenceError') ||
      error.text.includes('Cannot read') ||
      error.text.includes('undefined')
    );
    
    if (criticalErrors.length === 0) {
      console.log('✅ No critical JavaScript errors detected');
    } else {
      console.log(`❌ ${criticalErrors.length} critical errors found!`);
    }
    
    if (metrics.JSHeapUsedSize < 50 * 1024 * 1024) { // < 50MB
      console.log('✅ Memory usage within acceptable limits');
    } else {
      console.log('⚠️  High memory usage detected');
    }
    
    if (smartRefreshEvents.length > 0) {
      console.log('✅ Smart refresh system is active and logging events');
    } else {
      console.log('⚠️  No smart refresh activity detected');
    }
    
    console.log('==========================================');
    console.log('🏁 CONSOLE ANALYSIS COMPLETE');
    console.log('==========================================');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
  } finally {
    await browser.close();
  }
})();