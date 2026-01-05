import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { differenceInDays, parseISO, addDays, startOfMonth, format } from 'date-fns';

export default function SchedulerGantt({ items, dependencies, timeScale = 'day', onUpdateItem }) {
    // Gantt rendering logic
    // 1. Calculate timeline range (min start, max end)
    // 2. Draw timeline header
    // 3. Draw rows
    // 4. Draw bars

    const scrollContainerRef = useRef(null);

    // Simple auto-range for V1
    const startDate = startOfMonth(new Date());
    const endDate = addDays(startDate, 60);
    const totalDays = differenceInDays(endDate, startDate);

    const pxPerDay = 40;
    const totalWidth = totalDays * pxPerDay;

    // Dragging State
    const [draggingItem, setDraggingItem] = useState(null); // { itemId, initialX, initialStart }
    const [dragX, setDragX] = useState(0);

    const getLeft = (dateStr) => {
        if (!dateStr) return 0;
        const d = parseISO(dateStr);
        const diff = differenceInDays(d, startDate);
        return diff * pxPerDay;
    };

    const getWidth = (startStr, endStr) => {
        if (!startStr || !endStr) return pxPerDay; // Default 1 day
        const s = parseISO(startStr);
        const e = parseISO(endStr);
        const diff = differenceInDays(e, s) + 1; // Inclusive
        return Math.max(diff * pxPerDay, 10);
    };

    // Drag Logic
    const handleMouseDown = (e, item) => {
        if (!item.startAt) return;
        e.preventDefault();
        setDraggingItem({
            itemId: item.id,
            startX: e.clientX,
            originalStart: parseISO(item.startAt),
            originalEnd: item.endAt ? parseISO(item.endAt) : null
        });
        setDragX(0);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!draggingItem) return;
            const deltaX = e.clientX - draggingItem.startX;
            setDragX(deltaX);
        };

        const handleMouseUp = () => {
            if (!draggingItem) return;

            // Apply change if significant
            const daysDelta = Math.round(dragX / pxPerDay);
            if (daysDelta !== 0) {
                const item = items.find(i => i.id === draggingItem.itemId);
                if (item) {
                    const newStart = addDays(draggingItem.originalStart, daysDelta);
                    const newEnd = draggingItem.originalEnd ? addDays(draggingItem.originalEnd, daysDelta) : null;

                    onUpdateItem({
                        ...item,
                        startAt: format(newStart, 'yyyy-MM-dd'),
                        endAt: newEnd ? format(newEnd, 'yyyy-MM-dd') : null
                    });
                }
            }

            setDraggingItem(null);
            setDragX(0);
        };

        if (draggingItem) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingItem, dragX, items, onUpdateItem]);

    const getDragStyle = (item) => {
        const isDragging = draggingItem?.itemId === item.id;
        const baseLeft = getLeft(item.startAt);
        const width = getWidth(item.startAt, item.endAt);

        return {
            top: items.indexOf(item) * 37 + 8,
            left: baseLeft + (isDragging ? dragX : 0),
            width: width,
            height: 20
        };
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 overflow-hidden text-slate-200">
            {/* Timeline Header */}
            <div className="h-10 bg-slate-900 border-b border-slate-800 flex overflow-hidden relative select-none" ref={ref => {
                if (ref && scrollContainerRef.current) ref.scrollLeft = scrollContainerRef.current.scrollLeft;
            }}>
                <div style={{ width: totalWidth, position: 'relative' }}>
                    {/* Render days/weeks */}
                    {Array.from({ length: totalDays }).map((_, i) => (
                        <div
                            key={i}
                            style={{ left: i * pxPerDay, width: pxPerDay }}
                            className="absolute bottom-0 top-0 border-r border-slate-800 text-[10px] text-slate-500 p-1"
                        >
                            {format(addDays(startDate, i), 'd')}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gantt Body */}
            <div
                className="flex-1 overflow-auto relative select-none"
                ref={scrollContainerRef}
            >
                <div style={{ width: totalWidth, height: items.length * 37 }}> {/* 37px row height */}
                    {/* Grid lines */}
                    <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: totalDays }).map((_, i) => (
                            <div
                                key={i}
                                style={{ left: i * pxPerDay }}
                                className="absolute bottom-0 top-0 border-r border-slate-800/30 w-px h-full"
                            />
                        ))}
                    </div>

                    {/* Bars */}
                    {items.map((item, idx) => {
                        if (!item.startAt) return null;
                        const isDragging = draggingItem?.itemId === item.id;

                        return (
                            <div
                                key={item.id}
                                style={getDragStyle(item)}
                                onMouseDown={(e) => handleMouseDown(e, item)}
                                className={cn(
                                    "absolute rounded-sm border shadow-sm text-xs flex items-center px-2 truncate cursor-grab active:cursor-grabbing hover:brightness-110 transition-colors",
                                    item.type === 'deployment' ? "bg-blue-600 border-blue-500" : "bg-emerald-600 border-emerald-500",
                                    isDragging && "z-10 shadow-lg ring-2 ring-white/20"
                                )}
                            >
                                {item.title}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
