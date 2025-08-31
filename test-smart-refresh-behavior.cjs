const puppeteer = require('puppeteer');

async function testSmartRefreshBehavior() {
  console.log('🧪 TESTING SMART REFRESH BEHAVIOR - Real Browser');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    console.log(`📊 [${msg.type()}]: ${msg.text()}`);
  });
  
  try {
    console.log('📖 Step 1: Navigate and login');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    // Quick login
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const loginButton = await page.$('button');
    
    if (emailInput && passwordInput && loginButton) {
      await emailInput.type('m.kepinski@mamamia.app');
      await passwordInput.type('123Qwe123$');
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('📖 Step 2: Test Manual Refresh Button');
    const manualRefreshButton = await page.$('[data-testid="manual-refresh-button"]');
    
    if (manualRefreshButton) {
      // Get initial timestamp
      const initialTimestamp = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="last-update-timestamp"]');
        return element ? element.textContent : null;
      });
      console.log(`   Initial timestamp: "${initialTimestamp}"`);
      
      // Click manual refresh
      console.log('   Clicking manual refresh button...');
      await manualRefreshButton.click();
      
      // Wait and check for loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const loadingState = await page.evaluate(() => {
        const button = document.querySelector('[data-testid="manual-refresh-button"]');
        return button ? {
          disabled: button.disabled,
          textContent: button.textContent,
          className: button.className
        } : null;
      });
      
      console.log('   Loading state:', loadingState);
      
      // Wait for refresh to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get updated timestamp
      const updatedTimestamp = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="last-update-timestamp"]');
        return element ? element.textContent : null;
      });
      console.log(`   Updated timestamp: "${updatedTimestamp}"`);
      console.log(`   Timestamp changed: ${initialTimestamp !== updatedTimestamp ? '✅' : '❌'}`);
    }
    
    console.log('📖 Step 3: Test Auto-Refresh Indicator');
    const indicator = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="auto-refresh-indicator"]');
      return element ? {
        className: element.className,
        title: element.title
      } : null;
    });
    
    console.log('   Auto-refresh indicator:', indicator);
    
    console.log('📖 Step 4: Test Page Visibility Refresh');
    console.log('   Minimizing page to test visibility API...');
    
    // Create a new tab to simulate focus loss
    const newPage = await browser.newPage();
    await newPage.goto('about:blank');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Focus back to original page
    await page.bringToFront();
    console.log('   Focused back to original page');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📖 Step 5: Test Activity Detection');
    console.log('   Simulating user activity...');
    
    // Simulate mouse movement
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.move(300, 300);
    
    // Simulate keyboard activity  
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    console.log('   Activity simulated - monitoring for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('📖 Step 6: Final Analysis');
    
    // Check final state of all elements
    const finalState = await page.evaluate(() => {
      return {
        manualRefreshButton: document.querySelector('[data-testid="manual-refresh-button"]')?.textContent,
        timestamp: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent,
        indicator: {
          className: document.querySelector('[data-testid="auto-refresh-indicator"]')?.className,
          title: document.querySelector('[data-testid="auto-refresh-indicator"]')?.title
        }
      };
    });
    
    console.log('   Final UI state:', finalState);
    
    // Analyze console logs for smart refresh activity
    const refreshRelatedLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('refresh') ||
      log.text.toLowerCase().includes('activity') ||
      log.text.toLowerCase().includes('polling') ||
      log.text.toLowerCase().includes('visibility') ||
      log.text.toLowerCase().includes('smart') ||
      log.text.toLowerCase().includes('hook')
    );
    
    console.log(`📊 Smart refresh related logs found: ${refreshRelatedLogs.length}`);
    refreshRelatedLogs.forEach(log => console.log(`     [${log.type}] ${log.text}`));
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'smart-refresh-behavior-test.png', 
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved: smart-refresh-behavior-test.png');
    
  } catch (error) {
    console.error('❌ Smart refresh test failed:', error.message);
    await page.screenshot({ path: 'smart-refresh-error.png' });
  } finally {
    console.log('🧪 Smart refresh behavior test completed');
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testSmartRefreshBehavior().catch(console.error);
}

module.exports = { testSmartRefreshBehavior };