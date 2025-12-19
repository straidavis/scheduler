const { parseISO, isWithinInterval } = require('date-fns');

// Copied from src/lib/dateUtils.js for verification
const ORDERING_PERIODS = [
    { id: '1', start: '2024-07-14', end: '2025-09-30', label: 'Period 1' },
    { id: '2', start: '2025-10-01', end: '2026-09-30', label: 'Period 2' },
    { id: '3', start: '2026-10-01', end: '2027-09-30', label: 'Period 3' },
    { id: '4', start: '2027-10-01', end: '2028-09-30', label: 'Period 4' },
    { id: '5', start: '2028-10-01', end: '2029-09-30', label: 'Period 5' },
];

function getFiscalYear(dateString) {
    if (!dateString) return '';
    const date = parseISO(dateString);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed, 0 = Jan, 3 = Apr

    // "Fiscal years are start in Apr of the year and go until March the following."
    if (month >= 3) {
        return year + 1;
    } else {
        return year;
    }
}

function getOrderingPeriod(dateString) {
    if (!dateString) return null;
    const date = parseISO(dateString);

    const period = ORDERING_PERIODS.find(p => {
        const start = parseISO(p.start);
        const end = parseISO(p.end);
        return isWithinInterval(date, { start, end });
    });

    return period || null;
}

// Tests
const testCases = [
    { date: '2024-07-14', expectedFY: 2025, expectedPeriod: '1' },
    { date: '2025-09-30', expectedFY: 2026, expectedPeriod: '1' },
    { date: '2025-10-01', expectedFY: 2026, expectedPeriod: '2' },
    { date: '2026-03-31', expectedFY: 2026, expectedPeriod: '2' },
    { date: '2026-04-01', expectedFY: 2027, expectedPeriod: '2' },
    { date: '2025-12-02', expectedFY: 2026, expectedPeriod: '2' },
];

console.log('Running Date Logic Tests (Standalone)...');

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
