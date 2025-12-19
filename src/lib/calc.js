import { startOfWeek, endOfWeek, isSameWeek, parseISO, getMonth, getYear, format } from 'date-fns';

export function calculateWeeklyOvertime(entries, categories) {
    // Group entries by week
    const weeks = {};

    entries.forEach(entry => {
        const date = parseISO(entry.date);
        const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday start

        if (!weeks[weekStart]) {
            weeks[weekStart] = {
                weekStart,
                totalHours: 0,
                eligibleHours: 0,
                ineligibleHours: 0,
                entries: []
            };
        }

        const category = categories.find(c => c.id === entry.categoryId);
        const isEligible = category?.isOvertimeEligible || false;

        weeks[weekStart].entries.push(entry);
        weeks[weekStart].totalHours += entry.hours;

        if (isEligible) {
            weeks[weekStart].eligibleHours += entry.hours;
        } else {
            weeks[weekStart].ineligibleHours += entry.hours;
        }
    });

    // Calculate OT for each week
    const results = Object.values(weeks).map(week => {
        let regularHours = week.ineligibleHours;
        let overtimeHours = 0;
        let eligibleRegular = 0;

        if (week.eligibleHours > 40) {
            overtimeHours = week.eligibleHours - 40;
            eligibleRegular = 40;
        } else {
            eligibleRegular = week.eligibleHours;
        }

        regularHours += eligibleRegular;

        return {
            ...week,
            regularHours,
            overtimeHours,
            eligibleRegular
        };
    });

    return results;
}

export function aggregateMonthlyHours(entries, categories) {
    const months = {};

    // First, calculate OT adjustments per week to get accurate OT hours
    const weeklyData = calculateWeeklyOvertime(entries, categories);

    // Now distribute back to months? 
    // OT is calculated weekly, but we need monthly totals.
    // If a week splits across months, how do we attribute OT?
    // Usually based on the day the hours were worked.
    // But OT is a weekly aggregate.
    // Simplification: We'll just sum the raw hours per month for the graph, 
    // and maybe show OT as a separate line item calculated from the weekly data falling in that month?
    // Or, we attribute OT to the month the week *ends* in?
    // Let's just sum raw hours per category per month for now as requested: "total equivalent hours per month".
    // "Equivalent hours" might mean (Regular + 1.5 * OT).

    // Let's do: Sum of (Hours * RateMultiplier).
    // But we need to know which specific hours were OT.
    // This is complex.
    // Approach:
    // 1. Calculate OT per week.
    // 2. Prorate OT back to the days? 
    //    E.g. 50h week (10h OT). 20% of eligible hours are OT.
    //    Apply 1.5x multiplier to 20% of eligible hours on each day?
    //    Or just show "Overtime" as a separate category in the month?

    // Let's stick to the user request: "total equivalent hours per month in a graph that is rolled up per labor category".
    // I will calculate "Equivalent Hours" = Regular + (OT * 1.5).
    // To do this per category, I need to know which category generated the OT.
    // If I have multiple eligible categories, I'll distribute OT proportionally.

    // Implementation:
    // 1. Calculate weekly OT.
    // 2. For each week, determine the "OT Factor" = (EligibleRegular + 1.5 * OT) / EligibleTotal.
    //    Actually simpler: OT Hours are just added on top.
    //    If I have 10h OT, that's 5 extra "equivalent" hours.
    //    I will distribute these 5 hours across the eligible categories proportional to their hours that week.

    weeklyData.forEach(week => {
        const extraEquivalentHours = week.overtimeHours * 0.5; // The extra 0.5 part

        week.entries.forEach(entry => {
            const date = parseISO(entry.date);
            const monthKey = format(date, 'yyyy-MM');
            const category = categories.find(c => c.id === entry.categoryId);

            if (!months[monthKey]) months[monthKey] = {};
            if (!months[monthKey][entry.categoryId]) months[monthKey][entry.categoryId] = 0;

            let hours = entry.hours;

            // Add the OT premium if eligible and there was OT this week
            if (category?.isOvertimeEligible && week.eligibleHours > 0) {
                const share = entry.hours / week.eligibleHours;
                hours += extraEquivalentHours * share;
            }

            months[monthKey][entry.categoryId] += hours;
        });
    });

    return months;
}
