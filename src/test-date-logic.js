import { getFiscalYear, getOrderingPeriod } from './lib/dateUtils.js';

const testCases = [
    { date: '2024-07-14', expectedFY: 2025, expectedPeriod: '1' }, // Period 1 start
    { date: '2025-09-30', expectedFY: 2026, expectedPeriod: '1' }, // Period 1 end. Wait, Sep 2025 is FY26 (Apr 25 - Mar 26). Correct.
    { date: '2025-10-01', expectedFY: 2026, expectedPeriod: '2' }, // Period 2 start. Oct 2025 is FY26. Correct.
    { date: '2026-03-31', expectedFY: 2026, expectedPeriod: '2' }, // Period 2 mid. Mar 2026 is FY26. Correct.
    { date: '2026-04-01', expectedFY: 2027, expectedPeriod: '2' }, // Period 2 mid. Apr 2026 is FY27. Correct.
    { date: '2025-12-02', expectedFY: 2026, expectedPeriod: '2' }, // Current date
];

console.log('Running Date Logic Tests...');

let passed = 0;
let failed = 0;

testCases.forEach(({ date, expectedFY, expectedPeriod }) => {
    const fy = getFiscalYear(date);
    const period = getOrderingPeriod(date);

    const fyMatch = fy === expectedFY;
    const periodMatch = period && period.id === expectedPeriod;

    if (fyMatch && periodMatch) {
        console.log(`[PASS] ${date}: FY${fy}, Period ${period.id}`);
        passed++;
    } else {
        console.error(`[FAIL] ${date}:`);
        if (!fyMatch) console.error(`  Expected FY${expectedFY}, got FY${fy}`);
        if (!periodMatch) console.error(`  Expected Period ${expectedPeriod}, got Period ${period ? period.id : 'null'}`);
        failed++;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
