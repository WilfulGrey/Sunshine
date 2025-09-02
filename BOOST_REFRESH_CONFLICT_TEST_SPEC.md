# Boost/Refresh Conflict Test Specification

## 🎯 **The Real Problem to Test**

Users report that when they boost a task (move to #1 position) and then switch browser tabs, their boost gets "lost" - the task reverts back to the upcoming list instead of staying in the focused position.

## 🔍 **Correct DOM Structure Analysis**

Based on TaskFocusedView.tsx:

### **Focused Task Area (What Changes During Boost)**
```html
<div class="flex-1">
  <h3 class="text-2xl font-bold text-gray-900 mb-3">{nextTask.title}</h3>
  <!-- This should show the boosted task name -->
</div>
```

### **Upcoming Tasks List (Where Tasks Disappear From)**
```html
<div class="space-y-3">
  {upcomingTasks.map((task, index) => (
    <div key={task.id} class="bg-white rounded-lg border p-4">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-3 flex-1">
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-900 truncate">{task.title}</h4>
            <!-- Boosted task should disappear from here -->
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

## 🧪 **Test Scenarios to Implement**

### **Scenario 1: Tab Visibility Change (Primary User Complaint)**

**Test Steps:**
1. **Capture Initial State**
   - Record focused task name: `div.flex-1 > h3.text-2xl`
   - Record upcoming task names: `div.space-y-3 h4.font-medium`
   - Identify target task: first task in upcoming list

2. **Execute Boost Operation**
   - Click boost button for target task
   - Wait 100ms for boost to start
   - Capture "during boost" state

3. **Trigger Tab Switch (Critical Moment)**
   - Set `document.hidden = true`
   - Fire `visibilitychange` event
   - Wait 1000ms
   - Set `document.hidden = false` 
   - Fire `visibilitychange` event
   - Wait 2000ms for refresh to complete

4. **Measure Results**
   - **SUCCESS**: Target task is now in focused position (`div.flex-1 > h3`)
   - **SUCCESS**: Target task disappeared from upcoming list
   - **CONFLICT**: Target task reverted to upcoming list
   - **CONFLICT**: Different task appeared in focused position

### **Scenario 2: Manual Refresh Click**
Same steps but trigger refresh by clicking `[data-testid="manual-refresh-button"]`

### **Scenario 3: Activity Detection**
Same steps but trigger activity events: `focus`, `visibilitychange`

### **Scenario 4: Smart Polling**
Same steps but wait 3+ seconds for natural polling interval

### **Scenario 5: Rapid Multiple Triggers**
Same steps but trigger multiple refresh events in quick succession

## 📏 **Success/Failure Criteria**

### **✅ Boost Success (No Conflict)**
- Target task moves from upcoming list to focused position
- Target task stays in focused position after refresh
- Target task is removed from upcoming list permanently

### **🚨 Boost Conflict Detected**
- **Type A**: Task moves to focused but reverts after refresh
- **Type B**: Task never moves despite boost button click
- **Type C**: Task moves but different task appears in focused position
- **Type D**: Task disappears from upcoming but doesn't appear in focused

## 🔧 **Correct DOM Selectors**

```javascript
// FOCUSED TASK (should change during successful boost)
const focusedTaskName = document.querySelector('div.flex-1 > h3.text-2xl.font-bold.text-gray-900')?.textContent?.trim();

// UPCOMING TASKS (should lose one task during successful boost)
const upcomingTaskElements = document.querySelectorAll('div.space-y-3 > div.bg-white h4.font-medium.text-gray-900.truncate');
const upcomingTaskNames = Array.from(upcomingTaskElements).map(el => el.textContent?.trim());

// BOOST BUTTONS (should show spinners during boost)
const boostButtons = document.querySelectorAll('button[title*="pozycję"]');
const activeSpinners = document.querySelectorAll('button[title*="pozycję"] .animate-spin').length;
```

## 📊 **Expected Test Output**

### **No Conflict Scenario:**
```
🎯 Target Task: "John Doe - Kontakt telefoniczny"
📍 Pre-boost:  Focused="Jane Smith", Upcoming=["John Doe", "Mike Wilson", ...]
📍 During-boost: Focused="Jane Smith", Upcoming=["John Doe", "Mike Wilson", ...], Spinners=1
📍 Post-refresh: Focused="John Doe", Upcoming=["Mike Wilson", ...], Spinners=0
✅ SUCCESS: Task moved to focused position and stayed there
```

### **Conflict Detected Scenario:**
```
🎯 Target Task: "John Doe - Kontakt telefoniczny"  
📍 Pre-boost:  Focused="Jane Smith", Upcoming=["John Doe", "Mike Wilson", ...]
📍 During-boost: Focused="John Doe", Upcoming=["Mike Wilson", ...], Spinners=1
📍 Post-refresh: Focused="Jane Smith", Upcoming=["John Doe", "Mike Wilson", ...], Spinners=0
🚨 CONFLICT: Task was boosted but reverted by refresh!
```

## 🎪 **Test Implementation Notes**

1. **Wait for DOM Updates**: Use `waitForFunction` instead of fixed timeouts
2. **Verify Selectors Work**: Test should fail if it gets null/undefined from selectors
3. **Multiple Verification Points**: Check both focused position AND upcoming list
4. **Real Browser Timing**: Account for actual async operations, not just protection system logs
5. **Edge Case Coverage**: Test with different tasks, multiple boosts, network delays

## 🚨 **Critical Test Validation**

**Before running scenarios, validate:**
- ✅ Can read focused task name
- ✅ Can read upcoming task names (at least 2-3 tasks)
- ✅ Can identify boost buttons
- ✅ Can click boost buttons successfully
- ✅ Task names are actual names, not null/undefined

**If any validation fails → Test is invalid and results meaningless**

This specification ensures we're testing the actual user experience, not just the internal protection system logs.