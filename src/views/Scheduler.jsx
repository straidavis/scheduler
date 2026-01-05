import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Calendar, LayoutGrid, Users, Settings as SettingsIcon, AlertCircle, Loader2, Plus, Link } from 'lucide-react';
import SchedulerGrid from '../components/scheduler/SchedulerGrid';
import SchedulerGantt from '../components/scheduler/SchedulerGantt';
import ResourcePanel from '../components/scheduler/ResourcePanel';
import TimelinePanel from '../components/scheduler/TimelinePanel';
import DependencyDialog from '../components/scheduler/DependencyDialog';

export default function Scheduler() {
    const [viewMode, setViewMode] = useState('split'); // 'grid' | 'gantt' | 'split'
    const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'resources' | 'timelines'

    const [items, setItems] = useState([]);
    const [dependencies, setDependencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Layout
    const [gridWidth, setGridWidth] = useState(400);
    const [isResizingSplit, setIsResizingSplit] = useState(false);

    // Dialogs
    const [showDepDialog, setShowDepDialog] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizingSplit) return;
            const newWidth = Math.max(300, Math.min(window.innerWidth - 300, e.clientX));
            setGridWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizingSplit(false);
        if (isResizingSplit) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSplit]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [itemsRes, depsRes] = await Promise.all([
                fetch('http://localhost:8000/api/scheduler/items'),
                fetch('http://localhost:8000/api/scheduler/dependencies')
            ]);

            if (!itemsRes.ok || !depsRes.ok) throw new Error("Failed to load schedule data");

            const itemsData = await itemsRes.json();
            const depsData = await depsRes.json();

            setItems(itemsData);
            setDependencies(depsData);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = async (updatedItem) => {
        // Optimistic update
        setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        try {
            await fetch('http://localhost:8000/api/scheduler/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem)
            });
        } catch (err) {
            console.error("Failed to save item", err);
        }
    };

    const handleAddItem = async () => {
        const newItem = {
            id: crypto.randomUUID(),
            title: "New Task",
            type: "task",
            startAt: new Date().toISOString().split('T')[0],
            endAt: new Date().toISOString().split('T')[0],
            progress: 0,
            metadata: { status: "Draft" }
        };
        setItems(prev => [...prev, newItem]);
        try {
            await fetch('http://localhost:8000/api/scheduler/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
        } catch (err) { console.error(err); }
    };

    const handleAddDependency = async (dep) => {
        const newDep = { ...dep, id: crypto.randomUUID() };
        setDependencies(prev => [...prev, newDep]);
        try {
            await fetch('http://localhost:8000/api/scheduler/dependencies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDep)
            });
        } catch (err) { console.error(err); }
    };

    const handleAutoSchedule = async () => {
        const { autoSchedule } = await import('../lib/schedulerLogic'); // Keeping dynamic for code splitting or standard static if preferred
        // Actually, let's use the static import at top of file for reliability
        // But if we want to change top level, we need a full file rewrite or verify imports. 
        // Let's use standard import if possible. TO avoid changing top imports blindly, 
        // I'll stick to dynamic BUT fix syntax if any. 
        // "Failed to resolve entry for package" might be due to import path... 
        // Let's try explicit relative path again.

        try {
            // Re-verify schedulerLogic path. It is src/lib/schedulerLogic.js.
            // From views/Scheduler.jsx, it is ../lib/schedulerLogic.
            const module = await import('../lib/schedulerLogic.js');
            const newItems = module.autoSchedule(items, dependencies);
            setItems(newItems);

            for (const item of newItems) {
                await handleUpdateItem(item);
            }
        } catch (e) {
            console.error("Auto-schedule failed", e);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 w-full">
            {/* Toolbar */}
            <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-slate-100">Project Schedule</h1>
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('schedule')}
                            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'schedule' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
                        >
                            <Calendar className="h-4 w-4" /> Schedule
                        </button>
                        <button
                            onClick={() => setActiveTab('resources')}
                            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'resources' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
                        >
                            <Users className="h-4 w-4" /> Resources
                        </button>
                        <button
                            onClick={() => setActiveTab('timelines')}
                            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'timelines' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
                        >
                            <LayoutGrid className="h-4 w-4" /> Timelines
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleAutoSchedule} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" /> Auto Schedule
                    </button>
                    <div className="w-px h-6 bg-slate-800 mx-2" />
                    <button onClick={handleAddItem} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Task
                    </button>
                    <button onClick={() => setShowDepDialog(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                        <Link className="h-4 w-4" /> Link
                    </button>
                    <span className="text-xs text-slate-500 mr-2 ml-2">{items.length} items</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative w-full flex">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-400 gap-2">
                        <AlertCircle className="h-6 w-6" /> <span>{error}</span>
                    </div>
                )}

                {!loading && !error && activeTab === 'schedule' && (
                    <div className="flex h-full w-full">
                        <div style={{ width: gridWidth }} className="h-full overflow-hidden shrink-0">
                            <SchedulerGrid items={items} onUpdateItem={handleUpdateItem} />
                        </div>
                        <div
                            className="w-1 bg-slate-800 cursor-col-resize hover:bg-blue-500 transition-colors z-20 hover:w-1.5 shrink-0"
                            onMouseDown={() => setIsResizingSplit(true)}
                        />
                        <div className="flex-1 h-full overflow-hidden min-w-0">
                            <SchedulerGantt items={items} dependencies={dependencies} onUpdateItem={handleUpdateItem} />
                        </div>
                    </div>
                )}

                {!loading && activeTab === 'resources' && <ResourcePanel />}
                {!loading && activeTab === 'timelines' && <TimelinePanel items={items} />}

                <DependencyDialog
                    isOpen={showDepDialog}
                    onClose={() => setShowDepDialog(false)}
                    items={items}
                    onSave={handleAddDependency}
                />
            </div>
        </div>
    );
}
