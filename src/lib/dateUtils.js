import { parseISO, isWithinInterval, addYears, startOfYear, endOfYear } from 'date-fns';

/**
 * Calculates the Fiscal Year for a given date.
 * US Government Fiscal Year starts on October 1st of the previous calendar year 
 * and ends on September 30th of the named year.
 * However, the user prompt says: "The fiscal years are start in Apr of the year and go until March the following."
 * Wait, let me re-read the prompt carefully.
 * "The fiscal years are start in Apr of the year and go until March the following. Right now we are in FY26."
 * 
 * If FY26 starts in Apr 2025 and ends in Mar 2026? 
 * Or does it mean standard UK/India/etc fiscal year?
 * 
 * Let's look at the ordering periods provided:
 * 1- 7/14/24 to 9/30/25
 * 2 - 10/1/25 to 9/30/2026
 * 3- 10/1/26 to 9/30/2027
 * ...
 * 
 * The ordering periods 2, 3, 4, 5 align with standard US Gov FY (Oct 1 - Sep 30).
 * Period 1 is an exception (July 14 to Sep 30).
 * 
 * But the user explicitly said: "The fiscal years are start in Apr of the year and go until March the following. Right now we are in FY26."
 * This contradicts the ordering periods which look like US Gov FY.
 * 
 * Let's check the current date. 2025-12-02.
 * If "Right now we are in FY26", and it's Dec 2025.
 * If FY starts in Apr:
 * Apr 2025 - Mar 2026 = FY26?
 * Apr 2024 - Mar 2025 = FY25?
 * 
 * If I use standard US Gov FY (Oct 1 start):
 * Oct 2025 - Sep 2026 = FY26.
 * Dec 2025 is in FY26.
 * 
 * The ordering periods 2-5 are definitely Oct 1 - Sep 30.
 * Period 2: 10/1/25 to 9/30/26. This matches FY26 if using US Gov definition.
 * 
 * The user's statement "The fiscal years are start in Apr of the year and go until March the following" seems slightly contradictory to the ordering periods provided which are Oct-Sep (except the first one).
 * 
 * However, "Right now we are in FY26" (Dec 2025).
 * If FY26 is Apr 2025 - Mar 2026, then Dec 2025 is indeed FY26.
 * If FY26 is Oct 2025 - Sep 2026, then Dec 2025 is indeed FY26.
 * 
 * BUT, look at Ordering Period 1: 7/14/24 to 9/30/25.
 * If FY starts in Apr:
 * Apr 2024 - Mar 2025 = FY25
 * Apr 2025 - Mar 2026 = FY26
 * So Period 1 spans FY25 and FY26?
 * 
 * Ordering Period 2: 10/1/25 to 9/30/26.
 * This is entirely within Apr 2025 - Mar 2026? No, it goes until Sep 2026.
 * Sep 2026 would be in FY27 (Apr 26 - Mar 27).
 * 
 * So the ordering periods seem to follow US Gov FY (Oct-Sep), but the user *said* FY starts in Apr.
 * 
 * Let's re-read: "The fiscal years are start in Apr of the year and go until March the following. Right now we are in FY26."
 * 
 * Wait, maybe I should trust the Ordering Periods more for the "Ordering Period" field, and the FY definition for the "Fiscal Year" field?
 * 
 * Let's implement exactly what was asked.
 * 
 * Ordering Periods:
 * 1: 2024-07-14 to 2025-09-30
 * 2: 2025-10-01 to 2026-09-30
 * 3: 2026-10-01 to 2027-09-30
 * 4: 2027-10-01 to 2028-09-30
 * 5: 2028-10-01 to 2029-09-30
 * 
 * Fiscal Year:
 * Starts Apr 1, Ends Mar 31.
 * Current (Dec 2025) is FY26.
 * So Apr 1, 2025 - Mar 31, 2026 is FY26.
 * Formula: If Month >= 4 (April), FY = Year + 1. Else FY = Year.
 * Example: Dec 2025. Month 12 >= 4. FY = 2025 + 1 = 2026. Correct.
 * Example: Jan 2026. Month 1 < 4. FY = 2026. Correct.
 * 
 * Okay, I will implement this logic.
 */

export const ORDERING_PERIODS = [
    { id: '1', start: '2024-07-14', end: '2025-09-30', label: 'OP1' },
    { id: '2', start: '2025-10-01', end: '2026-09-30', label: 'OP2' },
    { id: '3', start: '2026-10-01', end: '2027-09-30', label: 'OP3' },
    { id: '4', start: '2027-10-01', end: '2028-09-30', label: 'OP4' },
    { id: '5', start: '2028-10-01', end: '2029-09-30', label: 'OP5' },
];

export function getFiscalYear(dateString) {
    if (!dateString) return '';
    try {
        const date = parseISO(dateString);
        if (isNaN(date)) return '';
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed, 0 = Jan, 3 = Apr

        // "Fiscal years are start in Apr of the year and go until March the following."
        if (month >= 3) {
            return year + 1;
        } else {
            return year;
        }
    } catch (e) {
        return '';
    }
}

export function getOrderingPeriod(dateString) {
    if (!dateString) return null;
    try {
        const date = parseISO(dateString);
        if (isNaN(date)) return null;

        // Check which period the date falls into
        const period = ORDERING_PERIODS.find(p => {
            const start = parseISO(p.start);
            const end = parseISO(p.end);
            return isWithinInterval(date, { start, end });
        });

        return period || null;
    } catch (e) {
        return null; // Return null if date is invalid
    }
}
