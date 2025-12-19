import { addDays, differenceInDays, getMonth, getYear, isBefore, parseISO, startOfDay, format } from 'date-fns';

export const FISCAL_YEAR_START_MONTH = 9; // October (0-indexed is 9)

export function getFiscalYear(date) {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const month = getMonth(d);
    const year = getYear(d);
    return month >= FISCAL_YEAR_START_MONTH ? year + 1 : year;
}

export function calculateBillingPeriods(startDate, endDate, type) {
    if (!startDate || !endDate) return { periods15Day: 0, remainderDays: 0, overAndAbove: 0 };

    const start = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : startDate);
    const end = startOfDay(typeof endDate === 'string' ? parseISO(endDate) : endDate);

    // Inclusive days
    const totalDays = differenceInDays(end, start) + 1;

    if (totalDays <= 0) return { periods15Day: 0, remainderDays: 0, overAndAbove: 0 };

    const periods15Day = Math.floor(totalDays / 15);
    const remainderDays = totalDays % 15;

    // Land based logic: Over and Above applies to each 15-day period
    const overAndAbove = type === 'Land' ? periods15Day : 0;

    return {
        periods15Day,
        remainderDays,
        overAndAbove,
        totalDays
    };
}

export function calculateEstimatedCost(billingPeriods, rates) {
    // rates: { period15DayRate, dailyRate, overAndAboveRate }
    const { periods15Day, remainderDays, overAndAbove } = billingPeriods;

    const cost15Day = periods15Day * (rates.period15DayRate || 0);
    const costDaily = remainderDays * (rates.dailyRate || 0);
    const costOverAndAbove = overAndAbove * (rates.overAndAboveRate || 0);

    return cost15Day + costDaily + costOverAndAbove;
}

export function generateBillingItems(deployment, rates) {
    if (!deployment.startDate || !deployment.endDate) return [];

    const start = startOfDay(parseISO(deployment.startDate));
    const periods = calculateBillingPeriods(deployment.startDate, deployment.endDate, deployment.type);
    const items = [];

    // 1. 15-Day Periods
    for (let i = 0; i < periods.periods15Day; i++) {
        const pStart = addDays(start, i * 15);
        const pEnd = addDays(pStart, 14); // 15 days inclusive
        items.push({
            id: `${deployment.id}_15day_${i}`,
            deploymentId: deployment.id,
            deploymentName: deployment.name,
            type: '15-Day CLIN',
            startDate: pStart.toISOString(),
            endDate: pEnd.toISOString(),
            amount: rates.period15DayRate || 0,
            sortDate: pStart
        });

        // Land based Over and Above (per 15-day period)
        if (deployment.type === 'Land') {
            items.push({
                id: `${deployment.id}_oa_${i}`,
                deploymentId: deployment.id,
                deploymentName: deployment.name,
                type: 'Over & Above',
                startDate: pStart.toISOString(),
                endDate: pEnd.toISOString(),
                amount: rates.overAndAboveRate || 0,
                sortDate: pStart
            });
        }
    }

    // 2. Remainder Days - Individual Lines
    if (periods.remainderDays > 0) {
        const rStart = addDays(start, periods.periods15Day * 15);

        for (let i = 0; i < periods.remainderDays; i++) {
            const dayDate = addDays(rStart, i);
            items.push({
                id: `${deployment.id}_daily_${format(dayDate, 'yyyyMMdd')}`,
                deploymentId: deployment.id,
                deploymentName: deployment.name,
                type: 'Daily Rate',
                startDate: dayDate.toISOString(),
                endDate: dayDate.toISOString(),
                amount: (rates.dailyRate || 0), // Single day amount
                sortDate: dayDate,
                description: `Day ${i + 1} of remainder`
            });
        }
    }

    return items.sort((a, b) => a.sortDate - b.sortDate);
}
