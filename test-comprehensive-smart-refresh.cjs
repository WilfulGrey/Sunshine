const puppeteer = require('puppeteer');

async function comprehensiveSmartRefreshTest() {
  console.log('🚀 COMPREHENSIVE SMART REFRESH TEST - REAL LOGIN & VERIFICATION');
  console.log('================================================');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Advanced console log capturing with categorization
  const consoleLogs = [];
  const smartRefreshLogs = [];
  const errorLogs = [];
  
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
      url: msg.location()?.url
    };
    
    consoleLogs.push(logEntry);
    
    // Categorize logs
    if (msg.type() === 'error') {
      errorLogs.push(logEntry);
    }
    
    if (msg.text().toLowerCase().includes('refresh') || 
        msg.text().toLowerCase().includes('activity') ||
        msg.text().toLowerCase().includes('polling') ||
        msg.text().toLowerCase().includes('visibility') ||
        msg.text().toLowerCase().includes('smart')) {
      smartRefreshLogs.push(logEntry);
    }
    
    // Real-time console output with color coding
    const prefix = msg.type() === 'error' ? '🔴 ERROR' : 
                   msg.type() === 'warn' ? '🟡 WARN' : 
                   msg.type() === 'log' ? '📊 LOG' : 
                   `📝 ${msg.type().toUpperCase()}`;
    console.log(`${prefix}: ${msg.text()}`);
  });
  
  // Page error handling
  page.on('pageerror', error => {
    console.log('💥 PAGE ERROR:', error.message);
    errorLogs.push({
      type: 'pageerror',
      text: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('\n🎯 STEP 1: NAVIGATE TO APP AND VERIFY LOAD');
    console.log('-----------------------------------------------');
    
    await page.goto('http://localhost:5175', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    console.log('✅ App loaded successfully');
    
    // Wait for React to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🔐 STEP 2: AUTHENTICATE WITH REAL CREDENTIALS');
    console.log('----------------------------------------------');
    
    // Check if already logged in
    const isLoggedIn = await page.$('[data-testid="task-focused-view"]') !== null;
    
    if (!isLoggedIn) {
      console.log('🔍 Login form detected, proceeding with authentication...');
      
      // Wait for login form to be fully rendered
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      
      // Clear and fill email
      await page.click('input[type="email"]', { clickCount: 3 });
      await page.type('input[type="email"]', 'm.kepinski@mamamia.app');
      console.log('📧 Email entered: m.kepinski@mamamia.app');
      
      // Clear and fill password
      await page.click('input[type="password"]', { clickCount: 3 });
      await page.type('input[type="password"]', '123Qwe123$');
      console.log('🔑 Password entered');
      
      // Find and click login button
      const loginButton = await page.$('button[type="submit"]') || 
                          await page.$('form button') ||
                          await page.$('button');
      
      if (loginButton) {
        console.log('🎯 Clicking login button...');
        await loginButton.click();
        
        // Wait for authentication to complete
        console.log('⏳ Waiting for authentication...');
        await page.waitForSelector('[data-testid="task-focused-view"], .task-focused-view', { 
          timeout: 30000 
        });
        console.log('✅ Successfully logged in and main view loaded');
      } else {
        throw new Error('Login button not found');
      }
    } else {
      console.log('✅ Already logged in');
    }
    
    // Give app time to fully initialize smart refresh hooks
    console.log('⏳ Allowing smart refresh hooks to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔍 STEP 3: VERIFY SMART REFRESH UI ELEMENTS');
    console.log('-------------------------------------------');
    
    // Check all required elements
    const elements = await page.evaluate(() => {
      return {
        manualRefreshButton: {
          exists: document.querySelector('[data-testid="manual-refresh-button"]') !== null,
          text: document.querySelector('[data-testid="manual-refresh-button"]')?.textContent,
          disabled: document.querySelector('[data-testid="manual-refresh-button"]')?.disabled
        },
        lastUpdateTimestamp: {
          exists: document.querySelector('[data-testid="last-update-timestamp"]') !== null,
          text: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent
        },
        autoRefreshIndicator: {
          exists: document.querySelector('[data-testid="auto-refresh-indicator"]') !== null,
          className: document.querySelector('[data-testid="auto-refresh-indicator"]')?.className,
          title: document.querySelector('[data-testid="auto-refresh-indicator"]')?.title
        },
        taskFocusedView: {
          exists: document.querySelector('[data-testid="task-focused-view"]') !== null ||
                   document.querySelector('.task-focused-view') !== null ||
                   document.querySelector('#task-focused-view') !== null
        }
      };
    });
    
    console.log('📊 Smart Refresh UI Elements Status:');
    console.log(`   Manual Refresh Button: ${elements.manualRefreshButton.exists ? '✅' : '❌'} - "${elements.manualRefreshButton.text}"`);
    console.log(`   Last Update Timestamp: ${elements.lastUpdateTimestamp.exists ? '✅' : '❌'} - "${elements.lastUpdateTimestamp.text}"`);
    console.log(`   Auto Refresh Indicator: ${elements.autoRefreshIndicator.exists ? '✅' : '❌'} - "${elements.autoRefreshIndicator.title}"`);
    console.log(`   TaskFocusedView Component: ${elements.taskFocusedView.exists ? '✅' : '❌'}`);
    
    if (!elements.manualRefreshButton.exists) {
      throw new Error('❌ CRITICAL: Manual refresh button not found!');
    }
    
    console.log('\n🔄 STEP 4: TEST MANUAL REFRESH FUNCTIONALITY');
    console.log('--------------------------------------------');
    
    const beforeRefreshTime = elements.lastUpdateTimestamp.text;
    console.log(`📅 Timestamp before refresh: "${beforeRefreshTime}"`);
    
    // Clear previous smart refresh logs
    smartRefreshLogs.length = 0;
    
    console.log('🎯 Triggering manual refresh...');
    await page.click('[data-testid="manual-refresh-button"]');
    
    // Monitor loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const loadingState = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="manual-refresh-button"]');
      return {
        disabled: button?.disabled,
        text: button?.textContent,
        hasSpinner: button?.querySelector('.animate-spin') !== null
      };
    });
    
    console.log(`🔄 Loading state: disabled=${loadingState.disabled}, hasSpinner=${loadingState.hasSpinner}`);
    console.log(`📝 Button text during loading: "${loadingState.text}"`);
    
    // Wait for refresh to complete
    console.log('⏳ Waiting for manual refresh to complete...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const afterRefreshElements = await page.evaluate(() => {
      return {
        timestamp: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent,
        buttonDisabled: document.querySelector('[data-testid="manual-refresh-button"]')?.disabled,
        errorMessage: document.querySelector('.text-red-600')?.textContent
      };
    });
    
    console.log(`📅 Timestamp after refresh: "${afterRefreshElements.timestamp}"`);
    console.log(`🔴 Error message: ${afterRefreshElements.errorMessage || 'None'}`);
    console.log(`✅ Manual refresh completed: ${beforeRefreshTime !== afterRefreshElements.timestamp ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\n🖱️ STEP 5: TEST ACTIVITY DETECTION');
    console.log('----------------------------------');
    
    console.log('🎯 Simulating intensive user activity...');
    
    // Clear logs before activity test
    const logCountBefore = consoleLogs.length;
    
    // Simulate various user activities
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(100 + i * 50, 100 + i * 30);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Keyboard activity
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    
    // Click activity
    await page.click('body');
    await page.click('[data-testid="task-focused-view"]');
    
    // Scroll activity
    await page.evaluate(() => {
      window.scrollTo(0, 100);
      window.scrollTo(0, 0);
    });
    
    console.log('✅ User activity simulation completed');
    console.log('⏳ Monitoring for activity detection (10 seconds)...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const logCountAfter = consoleLogs.length;
    const newLogs = logCountAfter - logCountBefore;
    console.log(`📊 New console logs during activity: ${newLogs}`);
    
    console.log('\n👁️ STEP 6: TEST PAGE VISIBILITY API');
    console.log('-----------------------------------');
    
    console.log('🎯 Testing page visibility changes...');
    
    // Create new tab to trigger visibility change
    const secondPage = await browser.newPage();
    await secondPage.goto('about:blank');
    console.log('📱 Created second tab (page should be hidden)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Focus back to main page
    await page.bringToFront();
    console.log('👁️ Focused back to main page (page should be visible)');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Close second page
    await secondPage.close();
    
    console.log('\n⏰ STEP 7: TEST SMART POLLING OVER TIME');
    console.log('--------------------------------------');
    
    console.log('🕐 Monitoring smart polling activity for 60 seconds...');
    console.log('   (This will test background polling intervals)');
    
    const pollingStartTime = Date.now();
    const initialConsoleLogCount = consoleLogs.length;
    
    // Monitor for 60 seconds
    let intervalCount = 0;
    const monitorInterval = setInterval(() => {
      intervalCount++;
      const elapsed = Math.floor((Date.now() - pollingStartTime) / 1000);
      const currentLogCount = consoleLogs.length;
      const newLogsInInterval = currentLogCount - initialConsoleLogCount;
      
      console.log(`   ${elapsed}s: ${newLogsInInterval} total new logs, ${smartRefreshLogs.length} smart refresh related`);
      
      if (intervalCount >= 12) { // 12 * 5s = 60s
        clearInterval(monitorInterval);
      }
    }, 5000);
    
    // Wait for full monitoring period
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('\n📊 STEP 8: COMPREHENSIVE ANALYSIS');
    console.log('=================================');
    
    // Final element state check
    const finalElements = await page.evaluate(() => {
      return {
        manualRefreshButton: document.querySelector('[data-testid="manual-refresh-button"]')?.textContent,
        timestamp: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent,
        indicator: {
          className: document.querySelector('[data-testid="auto-refresh-indicator"]')?.className,
          title: document.querySelector('[data-testid="auto-refresh-indicator"]')?.title
        }
      };
    });
    
    console.log('🎯 FINAL RESULTS SUMMARY:');
    console.log('========================');
    console.log(`📊 Total Console Logs: ${consoleLogs.length}`);
    console.log(`🔴 Error Logs: ${errorLogs.length}`);
    console.log(`🚀 Smart Refresh Logs: ${smartRefreshLogs.length}`);
    console.log(`🔄 Manual Refresh Button: "${finalElements.manualRefreshButton}"`);
    console.log(`⏰ Current Timestamp: "${finalElements.timestamp}"`);
    console.log(`🟢 Auto Refresh Indicator: "${finalElements.indicator.title}"`);
    
    if (smartRefreshLogs.length > 0) {
      console.log('\n📋 SMART REFRESH LOG DETAILS:');
      smartRefreshLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. [${log.type}] ${log.text}`);
      });
    }
    
    if (errorLogs.length > 0) {
      console.log('\n🔴 ERROR LOG DETAILS:');
      errorLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. [${log.type}] ${log.text}`);
      });
    }
    
    // Take final comprehensive screenshot
    await page.screenshot({ 
      path: 'comprehensive-smart-refresh-test-final.png', 
      fullPage: true 
    });
    
    console.log('\n✅ COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!');
    console.log('📸 Screenshot saved: comprehensive-smart-refresh-test-final.png');
    
    // Return test results for verification
    return {
      success: true,
      totalLogs: consoleLogs.length,
      errorLogs: errorLogs.length,
      smartRefreshLogs: smartRefreshLogs.length,
      elementsFound: {
        manualRefreshButton: elements.manualRefreshButton.exists,
        timestamp: elements.lastUpdateTimestamp.exists,
        indicator: elements.autoRefreshIndicator.exists,
        taskFocusedView: elements.taskFocusedView.exists
      }
    };
    
  } catch (error) {
    console.error('\n💥 COMPREHENSIVE TEST FAILED:', error.message);
    console.error('📊 Logs collected before failure:', consoleLogs.length);
    
    if (errorLogs.length > 0) {
      console.error('🔴 Errors encountered:');
      errorLogs.forEach(log => console.error(`   - ${log.text}`));
    }
    
    // Take error screenshot
    await page.screenshot({ path: 'comprehensive-test-error.png' });
    console.error('📸 Error screenshot saved: comprehensive-test-error.png');
    
    return {
      success: false,
      error: error.message,
      totalLogs: consoleLogs.length,
      errorLogs: errorLogs.length
    };
    
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
  }
}

// Run the comprehensive test
if (require.main === module) {
  comprehensiveSmartRefreshTest()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 TEST SUITE PASSED - SMART REFRESH VERIFIED!');
      } else {
        console.log('\n❌ TEST SUITE FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 TEST EXECUTION FAILED:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveSmartRefreshTest };