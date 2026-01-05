import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight, ChevronDown, User } from 'lucide-react';

export default function SchedulerGrid({ items, onUpdateItem }) {
    // Basic table layout
    // Support indent based on parent/child?
    // For V1 flat list with sortOrder?

    // Flattening hierarchy if needed, but for now simple list
    // The items passed in should be sorted by sortOrder or we sort them here.

    const [columns, setColumns] = useState([
        { key: 'title', label: 'Title', width: 250 },
        { key: 'startAt', label: 'Start', width: 120 },
        { key: 'endAt', label: 'End', width: 120 },
        { key: 'type', label: 'Type', width: 100 },
        { key: 'status', label: 'Status', width: 100 },
        { key: 'resources', label: 'Resources', width: 150 },
    ]);

    // Resizing State
    const [resizingCol, setResizingCol] = useState(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Editing State
    const [editingCell, setEditingCell] = useState(null); // { itemId, field }
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingCol) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            setColumns(prev => prev.map(c => c.key === resizingCol ? { ...c, width: newWidth } : c));
        };
        const handleMouseUp = () => {
            if (resizingCol) setResizingCol(null);
        };

        if (resizingCol) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol, startX, startWidth]);

    const startResize = (e, colKey, currentWidth) => {
        e.preventDefault();
        setResizingCol(colKey);
        setStartX(e.clientX);
        setStartWidth(currentWidth);
    };

    const startEditing = (item, field, value) => {
        setEditingCell({ itemId: item.id, field });
        setEditValue(value || '');
    };

    const saveEdit = () => {
        if (!editingCell) return;
        const { itemId, field } = editingCell;
        const item = items.find(i => i.id === itemId);
        if (item) {
            const newItem = { ...item, [field]: editValue };
            onUpdateItem(newItem);
        }
        setEditingCell(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    return (
        <div className="flex flex-col h-full border-r border-slate-800 bg-slate-900/30">
            {/* Header */}
            <div className="flex bg-slate-950 border-b border-slate-800">
                {columns.map(col => (
                    <div
                        key={col.key}
                        style={{ width: col.width }}
                        className="relative px-3 py-2 text-xs font-semibold text-slate-400 border-r border-slate-800 truncate shrink-0 group"
                    >
                        {col.label}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 z-10"
                            onMouseDown={(e) => startResize(e, col.key, col.width)}
                        />
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-auto">
                {items.map((item, idx) => (
                    <div key={item.id} className="flex border-b border-slate-800 hover:bg-slate-800/20 group">
                        {columns.map(col => {
                            const isEditing = editingCell?.itemId === item.id && editingCell?.field === col.key;
                            const value = item[col.key] || item.metadata?.[col.key] || '';

                            return (
                                <div
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className="px-3 py-2 text-sm text-slate-300 border-r border-slate-800 truncate flex items-center shrink-0 cursor-text"
                                    onClick={() => !isEditing && startEditing(item, col.key, value)}
                                >
                                    {col.key === 'title' && (
                                        <span className="mr-2 text-xs text-slate-500 select-none">{idx + 1}</span>
                                    )}

                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            className="w-full bg-slate-800 text-white px-1 rounded outline-none border border-blue-500"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={saveEdit}
                                            onKeyDown={handleKeyDown}
                                        />
                                    ) : (
                                        <span>{value}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
