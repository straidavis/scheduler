import { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, parseISO,
    addMonths, subMonths, differenceInCalendarDays, addDays, isBefore, isAfter, max, min
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Calendar() {
    const { data } = useStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    // Generate weeks for the current view
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Process deployments for the current view
    const deployments = useMemo(() => {
        return data.deployments
            .filter(d => d.status !== 'Archived')
            .map(d => ({
                ...d,
                start: parseISO(d.startDate),
                end: d.endDate ? parseISO(d.endDate) : new Date(2099, 11, 31)
            }));
    }, [data.deployments]);

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Calendar</h2>
                    <p className="text-slate-400">Visual schedule of deployments and labor.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 shadow-sm">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-l-lg border-r border-slate-800">
                            <ChevronLeft className="h-5 w-5 text-slate-400" />
                        </button>
                        <div className="px-4 py-2 font-semibold text-slate-100 min-w-[140px] text-center">
                            {format(currentMonth, 'MMMM yyyy')}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-r-lg border-l border-slate-800">
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 shadow-sm flex flex-col overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col min-h-full">
                        {weeks.map((week, weekIdx) => (
                            <WeekRow
                                key={weekIdx}
                                week={week}
                                monthStart={monthStart}
                                deployments={deployments}
                                laborEntries={data.laborEntries}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WeekRow({ week, monthStart, deployments, laborEntries }) {
    const weekStart = week[0];
    const weekEnd = week[6];

    // Find deployments visible in this week
    const weekDeployments = deployments.filter(d =>
        (d.start <= weekEnd && d.end >= weekStart)
    ).sort((a, b) => a.start - b.start);

    // Layout algorithm for this week
    const tracks = [];
    weekDeployments.forEach(d => {
        // Calculate start/end columns (0-6)
        // If starts before week, col is 0. If starts in week, col is difference.
        let startCol = 0;
        if (isAfter(d.start, weekStart)) {
            startCol = differenceInCalendarDays(d.start, weekStart);
        }

        let endCol = 6;
        if (isBefore(d.end, weekEnd)) {
            endCol = differenceInCalendarDays(d.end, weekStart);
        }

        // Find first track where this fits
        let trackIdx = 0;
        while (true) {
            if (!tracks[trackIdx]) {
                tracks[trackIdx] = [];
                break;
            }
            const hasOverlap = tracks[trackIdx].some(existing => {
                return (startCol <= existing.endCol && endCol >= existing.startCol);
            });
            if (!hasOverlap) break;
            trackIdx++;
        }

        tracks[trackIdx].push({ ...d, startCol, endCol });
    });

    return (
        <div className="flex-1 min-h-[120px] border-b border-slate-800 relative">
            {/* Background Grid */}
            <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                {week.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "border-r border-slate-800 h-full",
                                !isCurrentMonth && "bg-slate-950/50",
                                dayIdx === 6 && "border-r-0"
                            )}
                        >
                            <div className="p-2 flex justify-between items-start">
                                <span className={cn(
                                    "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                    isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-400" : "text-slate-600"
                                )}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Content Layer */}
            <div className="relative z-10 pt-10 pb-2 flex flex-col gap-1">
                {/* Render Tracks */}
                {tracks.map((track, trackIdx) => (
                    <div key={trackIdx} className="grid grid-cols-7 gap-px px-px h-7">
                        {track.map(d => (
                            <div
                                key={d.id}
                                className={cn(
                                    "rounded-md px-2 flex items-center text-xs font-medium truncate shadow-sm border",
                                    d.type === 'Land'
                                        ? "bg-green-900/40 text-green-300 border-green-800"
                                        : "bg-blue-900/40 text-blue-300 border-blue-800"
                                )}
                                style={{
                                    gridColumnStart: d.startCol + 1,
                                    gridColumnEnd: d.endCol + 2
                                }}
                                title={`${d.name} (${format(d.start, 'MMM d')} - ${d.endDate ? format(d.end, 'MMM d') : 'Ongoing'})`}
                            >
                                {d.name}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
