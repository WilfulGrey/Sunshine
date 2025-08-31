const puppeteer = require('puppeteer');

async function inspectRealApp() {
  console.log('🔍 REAL APP INSPECTION - Evidence Based Testing');
  
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
    console.log(`📊 CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  try {
    console.log('📖 Step 1: Navigate to localhost:5174');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    console.log('📖 Step 2: Check if login form is present');
    const loginFormExists = await page.$('input[type="email"]') !== null;
    console.log(`   Login form exists: ${loginFormExists}`);
    
    if (loginFormExists) {
      console.log('📖 Step 3: Login with real credentials');
      
      // Fill login form
      await page.type('input[type="email"]', 'm.kepinski@mamamia.app');
      await page.type('input[type="password"]', '123Qwe123$');
      
      console.log('   Filled credentials: m.kepinski@mamamia.app');
      
      // Click login button (try multiple selectors)
      let loginButton = await page.$('button[type="submit"]');
      if (!loginButton) {
        loginButton = await page.$('button');
      }
      if (!loginButton) {
        // Look for any button in form
        loginButton = await page.$('form button');
      }
      
      if (loginButton) {
        await loginButton.click();
        console.log('   Clicked login button');
        
        // Wait for navigation or main app to load
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('   ⚠️ No login button found');
      }
    }
    
    console.log('📖 Step 4: Inspect TaskFocusedView elements');
    
    // Check for manual refresh button
    const manualRefreshButton = await page.$('[data-testid="manual-refresh-button"]');
    console.log(`   manual-refresh-button exists: ${manualRefreshButton !== null}`);
    
    if (manualRefreshButton) {
      const buttonText = await page.evaluate(el => el.textContent, manualRefreshButton);
      console.log(`   Button text: "${buttonText}"`);
    }
    
    // Check for timestamp element
    const timestampElement = await page.$('[data-testid="last-update-timestamp"]');
    console.log(`   last-update-timestamp exists: ${timestampElement !== null}`);
    
    if (timestampElement) {
      const timestampText = await page.evaluate(el => el.textContent, timestampElement);
      console.log(`   Timestamp text: "${timestampText}"`);
    }
    
    // Check for auto-refresh indicator
    const autoRefreshIndicator = await page.$('[data-testid="auto-refresh-indicator"]');
    console.log(`   auto-refresh-indicator exists: ${autoRefreshIndicator !== null}`);
    
    console.log('📖 Step 5: Check for TaskFocusedView component');
    const taskFocusedView = await page.$('[data-testid="task-focused-view"], .task-focused-view, #task-focused-view');
    console.log(`   TaskFocusedView component exists: ${taskFocusedView !== null}`);
    
    // Get all refresh-related elements
    console.log('📖 Step 6: Find all refresh-related elements');
    const allRefreshElements = await page.$$eval('[data-testid*="refresh"], [class*="refresh"], [id*="refresh"]', 
      elements => elements.map(el => ({
        tagName: el.tagName,
        testId: el.getAttribute('data-testid'),
        className: el.className,
        id: el.id,
        textContent: el.textContent?.slice(0, 50)
      }))
    );
    
    console.log('   All refresh-related elements:', allRefreshElements);
    
    // Check if smart refresh hooks are being called
    console.log('📖 Step 7: Check for smart refresh hook activity in console');
    const refreshLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('refresh') || 
      log.text.toLowerCase().includes('activity') ||
      log.text.toLowerCase().includes('polling') ||
      log.text.toLowerCase().includes('visibility')
    );
    
    console.log(`   Smart refresh related console logs: ${refreshLogs.length}`);
    refreshLogs.forEach(log => console.log(`     [${log.type}] ${log.text}`));
    
    // Take a screenshot for evidence
    await page.screenshot({ 
      path: 'real-app-inspection.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as real-app-inspection.png');
    
    console.log('📖 Step 8: Final console analysis summary');
    console.log(`   Total console logs: ${consoleLogs.length}`);
    console.log(`   Error logs: ${consoleLogs.filter(log => log.type === 'error').length}`);
    console.log(`   Warning logs: ${consoleLogs.filter(log => log.type === 'warning').length}`);
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
    await page.screenshot({ path: 'inspection-error.png' });
  } finally {
    console.log('🔍 Real inspection completed');
    await browser.close();
  }
}

// Run the inspection
if (require.main === module) {
  inspectRealApp().catch(console.error);
}

module.exports = { inspectRealApp };