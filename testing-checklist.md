# CQE Alternates Enhancement - Testing Checklist

## Pre-Testing Setup
- [ ] Install Tampermonkey/Greasemonkey browser extension
- [ ] Copy and install the userscript from `implementation/cqe-alternates-enhancement.user.js`
- [ ] Open browser console (F12) for debugging
- [ ] Navigate to https://www.amazon.com/ab/bulk-order/input

## Phase 1 Testing - Foundation & UI

### Test 1: Page Detection
- [ ] Console shows: `[CQE Alternates] CQE Quote Request page detected`
- [ ] Console shows: `[CQE Alternates] CQE Alternates Enhancement initialized successfully`
- [ ] No JavaScript errors in console

### Test 2: Product Addition
- [ ] Add a product using existing CQE interface
- [ ] Suggested test ASIN: `B00V5D4VX8` (RKH Super Masking Tapes)
- [ ] Product appears in the table with image, name, quantity, price

### Test 3: Button Injection
- [ ] Product table shows "Manage item" dropdown in last column
- [ ] Click "Manage item" dropdown
- [ ] "Add Alternates" option appears at top of dropdown menu
- [ ] "Delete" option still present below
- [ ] Console shows: `Added "Add Alternates" button to row X`

### Test 4: Modal Opening
- [ ] Click "Add Alternates" option
- [ ] Modal opens with overlay background
- [ ] Product context shows: name, ASIN, quantity, price
- [ ] Chat interface visible with initial assistant message
- [ ] Manual ASIN section hidden initially
- [ ] Console shows: `Modal opened for product: [object]`

### Test 5: Modal Interaction
- [ ] Can close modal with X button
- [ ] Can close modal with Cancel button
- [ ] Can close modal with ESC key
- [ ] Can close modal by clicking overlay background
- [ ] Chat input field gets focus when modal opens

### Test 6: Conversation Flow
#### Willingness Check
- [ ] Type "Yes" and press Enter
- [ ] Assistant responds with requirements question
- [ ] Type "No" and press Enter (in new test)
- [ ] Manual ASIN section appears for "No" response

#### Requirements Gathering
- [ ] Type requirements: "Need similar masking tape, prefer 3M brand, under $2 per unit"
- [ ] Assistant acknowledges and mentions extracted keywords
- [ ] Processing message appears
- [ ] After 2 seconds, manual ASIN section appears

### Test 7: Manual ASIN Input
#### Valid ASIN Tests
- [ ] Enter valid ASIN: `B08N5WRWNW`
- [ ] ASIN gets added to list with "Remove" button
- [ ] Console shows: `Manual ASIN added: [object]`
- [ ] Confirm button updates to show count

#### URL Input Tests
- [ ] Enter Amazon URL: `https://www.amazon.com/dp/B08N5WRWNW`
- [ ] ASIN extracted and added correctly
- [ ] Different URL formats work (test various Amazon URL patterns)

#### Validation Tests
- [ ] Enter invalid ASIN: `invalid123`
- [ ] Error message appears with red styling
- [ ] Error clears after 5 seconds or valid input
- [ ] Enter duplicate ASIN
- [ ] Shows "already added" error

#### Management Tests
- [ ] Add multiple ASINs
- [ ] Click "Remove" button on ASIN
- [ ] ASIN removed from list
- [ ] Confirm button count updates

### Test 8: Completion Flow
- [ ] Add 2-3 ASINs manually
- [ ] Confirm button shows correct count
- [ ] Click "Add Selected Alternates"
- [ ] Success message appears in chat
- [ ] Modal closes automatically after 2 seconds
- [ ] Console shows: `Confirming alternates: [array]`

## Error Scenarios to Test

### Input Validation
- [ ] Empty chat input (should be ignored)
- [ ] Very long requirements text (should be truncated)
- [ ] Special characters in requirements
- [ ] Empty ASIN input (should show error)

### Edge Cases
- [ ] Multiple products in table (each should have button)
- [ ] Adding product while modal is open
- [ ] Network issues (simulated)
- [ ] Browser refresh with modal open

## Performance Tests
- [ ] Modal opens quickly (<500ms)
- [ ] Chat responses appear promptly
- [ ] No memory leaks after multiple open/close cycles
- [ ] Works with multiple browser tabs

## Browser Compatibility
Test in multiple browsers:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

## Console Log Verification
Expected log messages:
- [ ] `CQE Quote Request page detected`
- [ ] `Found X product rows`
- [ ] `Added "Add Alternates" button to row X`
- [ ] `Modal opened for product: [object]`
- [ ] `Chat message added (User/Assistant): [message]`
- [ ] `Manual ASIN added: [object]`
- [ ] `Confirming alternates: [array]`

## Issues Found
Document any issues here:
- Issue: 
- Expected: 
- Actual: 
- Console errors: 
- Steps to reproduce: 

## Next Steps
After testing Phase 1:
- [ ] All basic functionality works
- [ ] Ready for Phase 2 (Conversation Engine)
- [ ] Issues need to be fixed first

---
*Testing Date: [Fill in]*
*Tester: [Fill in]*
*Browser: [Fill in]*
*Status: [Pass/Fail/Partial]*
