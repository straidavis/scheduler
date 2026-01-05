import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Plus, LayoutTemplate, Settings } from 'lucide-react';
import SchedulerGantt from './SchedulerGantt'; // Reuse Gantt for now, or build swimlane wrapper

export default function TimelinePanel({ items }) {
    const [views, setViews] = useState([
        { id: '1', name: 'Deployment Roadmap', grouping: 'type' },
        { id: '2', name: 'Team Capacity', grouping: 'team' }
    ]);
    const [activeViewId, setActiveViewId] = useState('1');

    return (
        <div className="flex h-full bg-slate-950">
            {/* Sidebar List of Timelines */}
            <div className="w-64 border-r border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-100 text-sm">Timelines</h2>
                    <button className="text-slate-400 hover:text-white">
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                    {views.map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveViewId(view.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                activeViewId === view.id
                                    ? "bg-blue-900/30 text-blue-400"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            )}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                            {view.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Timeline Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/20">
                    <div className="flex items-center gap-4">
                        <h3 className="text-slate-100 font-medium">
                            {views.find(v => v.id === activeViewId)?.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
                            Group by: {views.find(v => v.id === activeViewId)?.grouping}
                        </span>
                    </div>
                    <button className="text-slate-400 hover:text-white">
                        <Settings className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    {/* Placeholder for actual swimlane rendering */}
                    {/* We can re-use SchedulerGantt but perhaps we need to group items first? */}

                    <div className="h-full border border-slate-800 rounded-lg bg-slate-900/30 flex items-center justify-center text-slate-500">
                        Swimlane visualization for {views.find(v => v.id === activeViewId)?.name} goes here.
                        (Requires Swimlane Renderer)
                    </div>
                </div>
            </div>
        </div>
    );
}
