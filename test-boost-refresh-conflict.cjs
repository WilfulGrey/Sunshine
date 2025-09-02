const puppeteer = require('puppeteer');
const path = require('path');

/**
 * COMPREHENSIVE BOOST/REFRESH CONFLICT TEST
 * 
 * This test reproduces the production issue where Smart Refresh System
 * conflicts with Boost operations, causing users to lose boost state
 * when switching tabs during active boost operations.
 * 
 * Test Sequence:
 * 1. Login with test credentials
 * 2. Wait for tasks to load
 * 3. Initiate boost operation (AlertTriangle or Phone)
 * 4. Immediately trigger tab visibility change
 * 5. Monitor boost state preservation vs loss
 * 6. Document exact failure behavior
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'm.kepinski@mamamia.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123Qwe123$';
const APP_URL = 'http://localhost:5173';

class BoostConflictAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleMessages = [];
    this.boostStates = [];
    this.refreshEvents = [];
    this.domMutations = [];
  }

  async initialize() {
    console.log('🚀 Initializing Boost/Refresh Conflict Analysis...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      slowMo: 100,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1400,900'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1400, height: 900 });
    
    // Comprehensive console monitoring
    this.page.on('console', (msg) => {
      const timestamp = new Date().toISOString();
      const message = {
        timestamp,
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      this.consoleMessages.push(message);
      
      // Track specific events
      if (msg.text().includes('boost') || msg.text().includes('refresh') || 
          msg.text().includes('visibility') || msg.text().includes('polling')) {
        console.log(`📝 [${timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Monitor network requests for Airtable calls
    this.page.on('response', async (response) => {
      if (response.url().includes('api.airtable.com')) {
        const timestamp = new Date().toISOString();
        console.log(`🌐 [${timestamp}] Airtable API: ${response.status()} ${response.url()}`);
        this.refreshEvents.push({
          timestamp,
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    // Monitor DOM mutations for boost state changes
    await this.page.evaluateOnNewDocument(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target.classList && 
              (mutation.target.classList.contains('animate-spin') ||
               mutation.target.textContent?.includes('boost') ||
               mutation.target.textContent?.includes('Loading'))) {
            
            window.domMutations = window.domMutations || [];
            window.domMutations.push({
              timestamp: new Date().toISOString(),
              type: mutation.type,
              target: mutation.target.className,
              text: mutation.target.textContent?.substring(0, 50)
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'disabled']
      });
    });

    console.log('✅ Puppeteer initialized with comprehensive monitoring');
  }

  async login() {
    console.log('🔐 Attempting login...');
    
    await this.page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if already logged in
    const isLoggedIn = await this.page.$('[data-testid="task-focused-view"]');
    if (isLoggedIn) {
      console.log('✅ Already logged in, proceeding to test');
      return;
    }

    // Login process
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await this.page.type('input[type="email"]', TEST_EMAIL);
    await this.page.type('input[type="password"]', TEST_PASSWORD);
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 15000 });
    
    console.log('✅ Login successful');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Allow full load
  }

  async waitForTasksAndRefreshSystem() {
    console.log('⏳ Waiting for tasks and Smart Refresh System...');
    
    // Wait for tasks to load
    await this.page.waitForSelector('[data-testid="task-focused-view"]', { timeout: 10000 });
    
    // Wait for refresh controls
    await this.page.waitForSelector('[data-testid="manual-refresh-button"]', { timeout: 5000 });
    await this.page.waitForSelector('[data-testid="auto-refresh-indicator"]', { timeout: 5000 });
    
    // Wait for upcoming tasks with boost buttons
    const boostButtons = await this.page.$$('button[title*="pozycję"]');
    if (boostButtons.length === 0) {
      throw new Error('❌ No boost buttons found - need tasks to test with');
    }
    
    console.log(`✅ Found ${boostButtons.length} boost buttons for testing`);
    
    // Let Smart Refresh System stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ Smart Refresh System stabilized');
  }

  async captureInitialState() {
    console.log('📸 Capturing initial state...');
    
    const state = await this.page.evaluate(() => {
      return {
        timestamp: new Date().toISOString(),
        refreshIndicator: document.querySelector('[data-testid="auto-refresh-indicator"]')?.title,
        lastUpdate: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent,
        boostButtons: Array.from(document.querySelectorAll('button[title*="pozycję"]')).map(btn => ({
          title: btn.title,
          disabled: btn.disabled,
          classes: btn.className
        })),
        activeTasks: Array.from(document.querySelectorAll('[data-testid="task-focused-view"] h3')).map(h => h.textContent)
      };
    });
    
    console.log('📋 Initial State:', JSON.stringify(state, null, 2));
    this.boostStates.push({ phase: 'initial', ...state });
    
    return state;
  }

  async executeBoostOperation(boostType = 'alert') {
    console.log(`🚀 Executing ${boostType} boost operation...`);
    
    // Find appropriate boost button
    const selector = boostType === 'alert' 
      ? 'button[title="Przenieś zadanie na pierwszą pozycję"]' 
      : 'button[title="Osoba dzwoni - przenieś na pierwszą pozycję"]';
    
    await this.page.waitForSelector(selector, { timeout: 5000 });
    
    // Capture pre-boost state
    const preBoostState = await this.captureCurrentState('pre-boost');
    console.log('📋 Pre-boost state captured');
    
    // Click boost button
    console.log(`🎯 Clicking ${boostType} boost button...`);
    await this.page.click(selector);
    
    // Wait for boost operation to start and DOM to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Capture during-boost state
    const duringBoostState = await this.captureCurrentState('during-boost');
    console.log('📋 During-boost state captured');
    
    return { preBoostState, duringBoostState };
  }

  async simulateTabVisibilityChange() {
    console.log('👁️ Simulating tab visibility change (critical moment)...');
    
    // Method 1: Use Page Visibility API directly
    await this.page.evaluate(() => {
      // Simulate tab going hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      
      // Trigger visibility change event
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('📱 Tab marked as HIDDEN');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Let visibility refresh settle
    
    // Method 2: Bring tab back to visible
    await this.page.evaluate(() => {
      // Simulate tab becoming visible again
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      
      // Trigger visibility change event (this should trigger refresh)
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });
    
    console.log('📱 Tab marked as VISIBLE (should trigger refresh)');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for refresh to complete
  }

  async captureCurrentState(phase) {
    const state = await this.page.evaluate(() => {
      // WORKING SELECTORS - verified by test-simple-selector.cjs
      
      // 1. Main focused task title - CONFIRMED WORKING
      const focusedTaskElement = document.querySelector('div.flex-1 h3');
      const focusedTaskName = focusedTaskElement?.textContent?.trim();
      
      // 2. Skip upcoming tasks - focus only on div.flex-1 content as requested
      const upcomingTaskNames = []; // Not needed for this test
      
      // 3. Simple boost button spinner detection
      const activeBoostSpinners = document.querySelectorAll('button[title*="pozycję"] .animate-spin').length;
      
      // 4. Task status indicators  
      const taskStatusButtons = [];
      const mainTaskArea = document.querySelector('[data-testid="task-focused-view"]');
      if (mainTaskArea) {
        const buttons = mainTaskArea.querySelectorAll('button');
        buttons.forEach(btn => {
          const text = btn.textContent?.trim();
          if (text && !text.includes('Odśwież') && !text.includes('Refresh')) {
            taskStatusButtons.push({
              text,
              classes: btn.className,
              disabled: btn.disabled,
              hasSpinner: btn.querySelector('.animate-spin') !== null
            });
          }
        });
      }
      
      // 5. System status
      const refreshIndicator = document.querySelector('[data-testid="auto-refresh-indicator"]')?.title;
      const lastUpdate = document.querySelector('[data-testid="last-update-timestamp"]')?.textContent;
      
      return {
        timestamp: new Date().toISOString(),
        focusedTaskName, // THE KEY MEASUREMENT - should change when boost succeeds
        activeBoostSpinners, // Spinner count during operations
        refreshIndicator: document.querySelector('[data-testid="auto-refresh-indicator"]')?.title,
        lastUpdate: document.querySelector('[data-testid="last-update-timestamp"]')?.textContent,
        // Debug info
        selectorWorking: !!focusedTaskElement && !!focusedTaskName
      };
    });
    
    this.boostStates.push({ phase, ...state });
    return state;
  }

  async analyzeBoostConflict() {
    console.log('🔍 Analyzing boost/refresh conflict based on ACTUAL TASK MOVEMENT...');
    
    const analysis = {
      conflictDetected: false,
      evidences: [],
      timeline: [],
      expectedBoostedTask: null,
      actualResult: null
    };
    
    const preBoost = this.boostStates.find(s => s.phase === 'pre-boost');
    const duringBoost = this.boostStates.find(s => s.phase === 'during-boost');
    const postVisibility = this.boostStates.find(s => s.phase === 'post-visibility');
    const finalState = this.boostStates.find(s => s.phase === 'final');
    
    if (!preBoost || !duringBoost || !postVisibility || !finalState) {
      analysis.evidences.push({
        type: 'incomplete_test',
        description: 'Missing required test phases for analysis'
      });
      return analysis;
    }
    
    console.log('🔍 RAW STATE DATA:');
    console.log('Pre-boost:', preBoost);
    console.log('During-boost:', duringBoost);  
    console.log('Final:', finalState);
    
    // Check if we actually captured valid data
    if (!preBoost || !duringBoost || !finalState) {
      analysis.evidences.push({
        type: 'invalid_test_data',
        description: 'Failed to capture valid state data during test'
      });
      return analysis;
    }
    
    console.log('🔍 FOCUSED TASK ANALYSIS (div.flex-1 content)');
    console.log(`Pre-boost: "${preBoost.focusedTaskName}"`);
    console.log(`During-boost: "${duringBoost.focusedTaskName}"`);  
    console.log(`Final: "${finalState.focusedTaskName}"`);
    
    const originalTask = preBoost.focusedTaskName;
    const duringTask = duringBoost.focusedTaskName; 
    const finalTask = finalState.focusedTaskName;
    
    // Set expected boosted task for display
    analysis.expectedBoostedTask = duringTask !== originalTask ? duringTask : 'No change detected';
    
    console.log(`📍 Task progression: "${originalTask}" → "${duringTask}" → "${finalTask}"`);
    
    // Check spinner activity
    console.log(`🔄 Spinners: pre=${preBoost.activeBoostSpinners}, during=${duringBoost.activeBoostSpinners}, final=${finalState.activeBoostSpinners}`);
    
    // BOOST OPERATION ANALYSIS
    const taskChangedDuring = duringTask !== originalTask;
    const taskChangedPermanently = finalTask !== originalTask;
    const taskRevertedAfterRefresh = taskChangedDuring && finalTask === originalTask;
    const hadSpinnerActivity = duringBoost.activeBoostSpinners > 0;
    
    analysis.actualResult = {
      originalTask,
      duringTask,
      finalTask,
      taskChangedDuring,
      taskChangedPermanently,
      taskRevertedAfterRefresh,
      hadSpinnerActivity,
      spinnerCounts: {
        pre: preBoost.activeBoostSpinners,
        during: duringBoost.activeBoostSpinners, 
        final: finalState.activeBoostSpinners
      }
    };
    
    console.log('🔍 BOOST ANALYSIS:');
    console.log(`Task changed during boost: ${taskChangedDuring}`);
    console.log(`Task changed permanently: ${taskChangedPermanently}`);
    console.log(`Task reverted after refresh: ${taskRevertedAfterRefresh}`);
    console.log(`Had spinner activity: ${hadSpinnerActivity}`);
    
    // CONFLICT DETECTION BASED ON ACTUAL TASK PROGRESSION
    
    // CONFLICT CASE 1: Task moved during boost but reverted after refresh
    if (taskRevertedAfterRefresh) {
      analysis.conflictDetected = true;
      analysis.evidences.push({
        type: 'boost_reverted_by_refresh',
        description: `Task changed during boost but reverted after refresh: "${originalTask}" → "${duringTask}" → "${finalTask}"`,
        evidence: 'Boost worked but refresh overwrote the change'
      });
    }
    
    // SUCCESS CASE: Boost worked and task stayed changed
    else if (taskChangedPermanently && hadSpinnerActivity) {
      console.log('✅ BOOST SUCCESS: Task changed and remained changed');
      analysis.conflictDetected = false;
    }
    
    // NEUTRAL CASE: No boost activity or no task change (could be normal)
    else if (!hadSpinnerActivity || !taskChangedDuring) {
      console.log('ℹ️ NO BOOST DETECTED: No significant boost activity or task changes');
      analysis.evidences.push({
        type: 'no_significant_boost_activity',
        description: `No meaningful boost detected: spinners=${hadSpinnerActivity}, taskChanged=${taskChangedDuring}`,
        possibleReasons: ['Boost button click failed', 'No available tasks to boost', 'Protection system blocked operation']
      });
    }
    
    // EDGE CASE: Task changed but no spinners (unexpected)
    else {
      analysis.evidences.push({
        type: 'unexpected_behavior',
        description: 'Unexpected boost behavior detected',
        details: { taskChangedDuring, taskChangedPermanently, hadSpinnerActivity }
      });
    }
    
    // Check for concurrent API calls during boost
    const boostTimestamp = duringBoost?.timestamp;
    if (boostTimestamp) {
      const relevantCalls = this.refreshEvents.filter(event => 
        event.timestamp > boostTimestamp && 
        event.timestamp < new Date(Date.parse(boostTimestamp) + 5000).toISOString()
      );
      
      if (relevantCalls.length > 0) {
        analysis.evidences.push({
          type: 'concurrent_api_calls',
          description: `${relevantCalls.length} Airtable API calls during boost operation`,
          calls: relevantCalls.length,
          timing: 'overlapped with boost operation'
        });
      }
    }
    
    // Timeline reconstruction
    analysis.timeline = [
      ...this.boostStates.map(state => ({
        timestamp: state.timestamp,
        event: `${state.phase}: focused="${state.focusedTaskName}"`,
        upcomingCount: state.upcomingTaskNames?.length || 0
      })),
      ...this.refreshEvents.slice(-5).map(event => ({
        timestamp: event.timestamp,
        event: `API: ${event.method} ${event.status}`,
        type: 'api_call'
      }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return analysis;
  }

  async testMultipleRefreshTriggers() {
    console.log('\n🔄 Testing ALL Smart Refresh triggers during boost...');
    
    const scenarios = [
      {
        name: 'Tab Visibility Change',
        description: 'User switches away from tab and back (most common user complaint)',
        action: async () => {
          await this.simulateTabVisibilityChange();
        }
      },
      {
        name: 'Manual Refresh Click',
        description: 'User clicks manual refresh button during boost',
        action: async () => {
          console.log('🖱️ Clicking manual refresh button...');
          await this.page.click('[data-testid="manual-refresh-button"]');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
      {
        name: 'Activity Detection Trigger',
        description: 'Simulating user inactivity then activity',
        action: async () => {
          console.log('💤 Simulating activity refresh trigger...');
          // Trigger activity detection by dispatching events
          await this.page.evaluate(() => {
            window.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('visibilitychange'));
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
      {
        name: 'Smart Polling Interval',
        description: 'Natural 30-second polling during boost',
        action: async () => {
          console.log('⏰ Waiting for smart polling interval...');
          // Wait longer to let natural polling kick in
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      },
      {
        name: 'Rapid Multiple Triggers',
        description: 'Multiple refresh triggers in quick succession',
        action: async () => {
          console.log('🔥 Triggering multiple rapid refreshes...');
          
          // Trigger visibility change
          await this.page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { value: true, writable: true });
            document.dispatchEvent(new Event('visibilitychange'));
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Trigger manual refresh
          await this.page.click('[data-testid="manual-refresh-button"]');
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Trigger visibility back
          await this.page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { value: false, writable: true });
            document.dispatchEvent(new Event('visibilitychange'));
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    ];

    return scenarios;
  }

  async executeFullConflictTest() {
    console.log('🎯 Executing comprehensive boost/refresh conflict test...');
    
    try {
      // Initialize and login
      await this.initialize();
      await this.login();
      await this.waitForTasksAndRefreshSystem();
      
      // Capture baseline
      await this.captureInitialState();
      
      // Get all refresh trigger scenarios
      const refreshScenarios = await this.testMultipleRefreshTriggers();
      
      const allResults = [];
      
      // Test each scenario
      for (let i = 0; i < refreshScenarios.length; i++) {
        const scenario = refreshScenarios[i];
        
        console.log(`\n=== SCENARIO ${i + 1}: ${scenario.name.toUpperCase()} ===`);
        console.log(`📝 ${scenario.description}`);
        
        // Reset states for each test
        this.boostStates = [];
        this.refreshEvents = [];
        this.consoleMessages = [];
        
        try {
          // Wait for system to stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Execute boost operation
          const { preBoostState, duringBoostState } = await this.executeBoostOperation('alert');
          
          console.log(`🎯 Original focused task: "${preBoostState.focusedTaskName}"`);
          
          // CRITICAL MOMENT: Execute refresh trigger during boost
          console.log('⚡ Executing refresh trigger during active boost...');
          await scenario.action();
          
          // Wait for DOM updates after refresh trigger
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Capture immediate post-refresh state
          await this.captureCurrentState('post-refresh');
          
          // Wait for all async operations to complete (boost completion + queued refreshes)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Final state capture
          await this.captureCurrentState('final');
          
          // Analyze this specific scenario
          const analysis = await this.analyzeBoostConflict();
          analysis.scenarioName = scenario.name;
          analysis.scenarioDescription = scenario.description;
          
          allResults.push(analysis);
          
          // Report results for this scenario
          console.log(`\n📊 ${scenario.name} Results:`);
          console.log(`Conflict Detected: ${analysis.conflictDetected ? '🚨 YES' : '✅ NO'}`);
          
          if (analysis.conflictDetected) {
            console.log(`❌ Problem: ${analysis.evidences[0]?.description || 'Boost was disrupted'}`);
          } else {
            console.log(`✅ Success: Boost completed despite ${scenario.name.toLowerCase()}`);
          }
          
          // Show actual task progression
          if (analysis.actualResult) {
            console.log(`Task progression: "${analysis.actualResult.originalTask}" → "${analysis.actualResult.duringTask}" → "${analysis.actualResult.finalTask}"`);
            if (analysis.actualResult.taskRevertedAfterRefresh) {
              console.log(`🚨 CONFLICT: Task was boosted but then reverted by refresh!`);
            } else if (analysis.actualResult.taskChangedPermanently) {
              console.log(`✅ SUCCESS: Task boost succeeded and persisted`);
            } else {
              console.log(`ℹ️ NEUTRAL: No significant boost or task change detected`);
            }
          }
          
        } catch (scenarioError) {
          console.error(`❌ Scenario ${scenario.name} failed:`, scenarioError.message);
          allResults.push({
            scenarioName: scenario.name,
            conflictDetected: true,
            evidences: [{ type: 'test_error', description: scenarioError.message }]
          });
        }
      }
      
      // COMPREHENSIVE SUMMARY
      console.log('\n🎯 COMPREHENSIVE CONFLICT ANALYSIS SUMMARY');
      console.log('==========================================');
      
      const totalConflicts = allResults.filter(r => r.conflictDetected).length;
      const totalTests = allResults.length;
      
      console.log(`Tests Run: ${totalTests}`);
      console.log(`Conflicts Found: ${totalConflicts}`);
      console.log(`Success Rate: ${Math.round(((totalTests - totalConflicts) / totalTests) * 100)}%`);
      
      if (totalConflicts > 0) {
        console.log('\n🚨 PROBLEMATIC SCENARIOS:');
        allResults.forEach((result, index) => {
          if (result.conflictDetected) {
            console.log(`${index + 1}. ${result.scenarioName}: ${result.evidences[0]?.description || 'Conflict detected'}`);
          }
        });
        
        console.log('\n🎯 NEXT STEPS: Fix conflicts in identified scenarios');
      } else {
        console.log('\n✅ ALL SCENARIOS PASSED: Current implementation handles refresh conflicts correctly');
      }
      
      return {
        totalTests,
        totalConflicts,
        results: allResults,
        overallConflictDetected: totalConflicts > 0
      };
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      throw error;
    } finally {
      if (this.browser) {
        console.log('🧹 Cleaning up browser...');
        await this.browser.close();
      }
    }
  }
}

// Execute the test
async function runBoostConflictTest() {
  const analyzer = new BoostConflictAnalyzer();
  
  try {
    const results = await analyzer.executeFullConflictTest();
    
    if (results.conflictDetected) {
      console.log('\n🎯 NEXT STEPS: Conflict confirmed - proceed with solution implementation');
      process.exit(1); // Exit with error to indicate conflict found
    } else {
      console.log('\n✅ No conflict detected - current implementation may be working correctly');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBoostConflictTest();
}

module.exports = { BoostConflictAnalyzer };