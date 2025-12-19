const { calculateBillingPeriods, calculateEstimatedCost, getFiscalYear } = require('./lib/billing.js');
const { calculateWeeklyOvertime } = require('./lib/labor.js');

console.log('--- Testing Billing Logic ---');

// Test 1: 20 days Land Deployment
const land20Days = calculateBillingPeriods('2025-01-01', '2025-01-20', 'Land');
console.log('Land 20 Days:', land20Days);
// Expected: 1 x 15-day, 5 remainder, 0 over/above.
if (land20Days.periods15Day === 1 && land20Days.remainderDays === 5 && land20Days.overAndAbove === 0) {
    console.log('PASS: Land 20 Days');
} else {
    console.error('FAIL: Land 20 Days');
}

// Test 2: 35 days Shore Deployment
const shore35Days = calculateBillingPeriods('2025-01-01', '2025-02-04', 'Shore');
console.log('Shore 35 Days:', shore35Days);
// Expected: 2 x 15-day (30 days), 5 remainder, 2 over/above.
if (shore35Days.periods15Day === 2 && shore35Days.remainderDays === 5 && shore35Days.overAndAbove === 2) {
    console.log('PASS: Shore 35 Days');
} else {
    console.error('FAIL: Shore 35 Days');
}

console.log('\n--- Testing Overtime Logic ---');

// Test 3: Overtime
const entries = [
    { date: '2025-01-06', hours: 10, categoryId: 'c1' }, // Mon
    { date: '2025-01-07', hours: 10, categoryId: 'c1' }, // Tue
    { date: '2025-01-08', hours: 10, categoryId: 'c1' }, // Wed
    { date: '2025-01-09', hours: 10, categoryId: 'c1' }, // Thu
    { date: '2025-01-10', hours: 10, categoryId: 'c1' }, // Fri
]; // Total 50 hours

const categories = [
    { id: 'c1', isOvertimeEligible: true }
];

const otResult = calculateWeeklyOvertime(entries, categories);
console.log('OT Result:', JSON.stringify(otResult, null, 2));

// Expected: 1 week, 50 total, 40 regular, 10 overtime.
if (otResult[0].totalHours === 50 && otResult[0].regularHours === 40 && otResult[0].overtimeHours === 10) {
    console.log('PASS: Overtime Calculation');
} else {
    console.error('FAIL: Overtime Calculation');
}
