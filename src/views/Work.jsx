import { useState } from 'react';
import { useStore } from '../store';
import { generateId, cn } from '../lib/utils';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Save, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Labor() {
    const { data, addLaborEntry } = useStore();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [entryType, setEntryType] = useState('Deployment'); // Deployment, Overhead, Pre, Post
    const [selectedDeploymentId, setSelectedDeploymentId] = useState('');

    // State for hours input per category
    const [hours, setHours] = useState({}); // { categoryId: hours }

    const activeDeployments = data.deployments.filter(d => d.status !== 'Archived');
    const selectedDeployment = activeDeployments.find(d => d.id === selectedDeploymentId);

    const getLaborDateRange = (deployment) => {
        if (!deployment) return null;
        if (deployment.laborPlanningMode === 'dates') {
            return { start: deployment.laborStartDate, end: deployment.laborEndDate };
        } else {
            // Relative
            const start = addDays(parseISO(deployment.startDate), -(deployment.laborDaysBefore || 0));
            const end = addDays(parseISO(deployment.endDate || deployment.startDate), (deployment.laborDaysAfter || 0));
            return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
        }
    };

    const handleSave = () => {
        if (entryType === 'Deployment') {
            if (!selectedDeploymentId) {
                alert('Please select a deployment');
                return;
            }

            const range = getLaborDateRange(selectedDeployment);
            if (!range || !range.start || !range.end) {
                alert('Invalid labor date range for this deployment');
                return;
            }

            const start = parseISO(range.start);
            const end = parseISO(range.end);
            const days = differenceInDays(end, start) + 1;

            if (days <= 0) {
                alert('Invalid date range');
                return;
            }

            // Bulk add for each day
            for (let i = 0; i < days; i++) {
                const currentDate = format(addDays(start, i), 'yyyy-MM-dd');
                Object.entries(hours).forEach(([categoryId, amount]) => {
                    if (amount > 0) {
                        addLaborEntry({
                            id: generateId(),
                            date: currentDate,
                            type: entryType,
                            deploymentId: selectedDeploymentId,
                            categoryId,
                            hours: parseFloat(amount)
                        });
                    }
                });
            }
            alert(`Saved labor entries for ${days} days!`);

        } else {
            // Single day entry for other types
            Object.entries(hours).forEach(([categoryId, amount]) => {
                if (amount > 0) {
                    addLaborEntry({
                        id: generateId(),
                        date: selectedDate,
                        type: entryType,
                        deploymentId: null,
                        categoryId,
                        hours: parseFloat(amount)
                    });
                }
            });
            alert('Labor saved!');
        }

        // Reset form
        setHours({});
    };

    const laborRange = entryType === 'Deployment' ? getLaborDateRange(selectedDeployment) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Labor Tracking</h2>
                    <p className="text-slate-400">Log labor hours.</p>
                </div>
                {entryType !== 'Deployment' && (
                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"><ChevronLeft className="h-4 w-4" /></button>
                        <span className="text-sm font-medium px-2 text-slate-200">{format(parseISO(selectedDate), 'MMM d, yyyy')}</span>
                        <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Type</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={entryType}
                                    onChange={e => setEntryType(e.target.value)}
                                >
                                    <option value="Deployment">Deployment</option>
                                    <option value="Overhead">Overhead</option>
                                    <option value="Pre-Deployment">Pre-Deployment</option>
                                    <option value="Post-Deployment">Post-Deployment</option>
                                </select>
                            </div>

                            {entryType !== 'Deployment' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {entryType === 'Deployment' && (
                            <div className="mb-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Select Deployment</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={selectedDeploymentId}
                                        onChange={e => setSelectedDeploymentId(e.target.value)}
                                    >
                                        <option value="">Select a deployment...</option>
                                        {activeDeployments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedDeployment && laborRange && (
                                    <div className="bg-blue-900/30 text-blue-400 border border-blue-900 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                                        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div>
                                            <span className="font-semibold">Bulk Entry Mode:</span> Hours entered below will be applied to every day from
                                            <span className="font-medium"> {format(parseISO(laborRange.start), 'MMM d')}</span> to
                                            <span className="font-medium"> {format(parseISO(laborRange.end), 'MMM d')}</span>
                                            ({differenceInDays(parseISO(laborRange.end), parseISO(laborRange.start)) + 1} days).
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-100 border-b border-slate-800 pb-2">Enter Daily Hours</h3>
                            {data.laborCategories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between">
                                    <label className="text-sm text-slate-400">{cat.name}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        className="w-24 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-right placeholder:text-slate-600"
                                        placeholder="0.0"
                                        value={hours[cat.id] || ''}
                                        onChange={e => setHours({ ...hours, [cat.id]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                {entryType === 'Deployment' ? 'Save Bulk Entry' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Entries / Summary */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Entries</h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {data.laborEntries.slice().reverse().slice(0, 20).map(entry => {
                                const cat = data.laborCategories.find(c => c.id === entry.categoryId);
                                const dep = data.deployments.find(d => d.id === entry.deploymentId);
                                return (
                                    <div key={entry.id} className="flex justify-between items-start text-sm border-b border-slate-800 pb-3 last:border-0">
                                        <div>
                                            <div className="font-medium text-slate-200">{cat?.name}</div>
                                            <div className="text-slate-500 text-xs">
                                                {format(parseISO(entry.date), 'MMM d')} • {entry.type}
                                                {dep && ` • ${dep.name}`}
                                            </div>
                                        </div>
                                        <div className="font-semibold text-blue-400">{entry.hours}h</div>
                                    </div>
                                );
                            })}
                            {data.laborEntries.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No entries yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
