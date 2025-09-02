const puppeteer = require('puppeteer');

/**
 * SIMPLE SELECTOR TEST
 * Just read div.flex-1 content - nothing else
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

async function testSelector() {
  console.log('🔍 Testing div.flex-1 selector...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    
    console.log('✅ Logged in successfully');
    
    // Wait for tasks to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test the selector
    const result = await page.evaluate(() => {
      try {
        // Test different variations
        const flexDiv = document.querySelector('div.flex-1');
        const flexDivH3 = document.querySelector('div.flex-1 h3');
        
        return {
          'div.flex-1 exists': !!flexDiv,
          'div.flex-1 h3 exists': !!flexDivH3,
          'div.flex-1 h3 text': flexDivH3?.textContent?.trim(),
          'all divs with flex-1': document.querySelectorAll('div.flex-1').length,
          'all h3 elements': document.querySelectorAll('h3').length,
          'preview': flexDiv?.innerHTML?.substring(0, 300)
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📋 SELECTOR TEST RESULTS:');
    console.log('Raw result:', result);
    
    if (result && result.tests) {
      Object.entries(result.tests).forEach(([test, value]) => {
        console.log(`${test}: ${value === null ? 'NULL' : value === undefined ? 'UNDEFINED' : typeof value === 'object' ? 'ELEMENT EXISTS' : value}`);
      });
      
      if (result.preview) {
        console.log('\n📄 DIV.FLEX-1 PREVIEW:');
        console.log(result.preview);
      }
    } else {
      console.log('❌ Failed to get selector results');
    }
    
  } finally {
    await browser.close();
  }
}

testSelector().catch(console.error);