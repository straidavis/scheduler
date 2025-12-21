import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { generateId, cn } from '../lib/utils';
import { format, parseISO, addMonths, startOfYear, addDays, eachDayOfInterval, isSameMonth, startOfMonth, endOfMonth, min, max } from 'date-fns';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar as CalendarIcon, Save, Plus, X, Trash2, ChevronLeft, ChevronRight, Calculator, Truck, Briefcase, Pencil } from 'lucide-react';

export default function Work() {
    const { data, addLaborCategory, updateLaborCategory, deleteLaborCategory } = useStore();
    const [activeTab, setActiveTab] = useState('deployment'); // 'deployment' | 'overhead'
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', isOvertimeEligible: false, baseRate: '' });
    const [editingCategory, setEditingCategory] = useState(null); // { id, name, isOvertimeEligible, baseRate }

    const handleCreateCategory = () => {
        if (!newCategory.name || !newCategory.baseRate) {
            alert('Please enter Name and Base Rate');
            return;
        }
        addLaborCategory({
            id: generateId(),
            name: newCategory.name,
            isOvertimeEligible: newCategory.isOvertimeEligible,
            baseRate: parseFloat(newCategory.baseRate)
        });
        setNewCategory({ name: '', isOvertimeEligible: false, baseRate: '' });
    };

    const handleUpdateCategory = () => {
        if (!editingCategory.name || !editingCategory.baseRate) {
            alert('Please enter Name and Base Rate');
            return;
        }
        updateLaborCategory(editingCategory.id, {
            name: editingCategory.name,
            isOvertimeEligible: editingCategory.isOvertimeEligible,
            baseRate: parseFloat(editingCategory.baseRate)
        });
        setEditingCategory(null);
    };

    const handleDeleteCategory = (id) => {
        if (confirm('Are you sure you want to delete this category?')) {
            deleteLaborCategory(id);
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col pt-4">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Labor Planning</h2>
                    <p className="text-slate-400">Manage deployment resources and overhead.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsManagingCategories(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Manage Categories
                    </button>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setActiveTab('deployment')}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'deployment' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Truck className="h-4 w-4" />
                            Deployment
                        </button>
                        <button
                            onClick={() => setActiveTab('overhead')}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                activeTab === 'overhead' ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Briefcase className="h-4 w-4" />
                            Overhead
                        </button>
                    </div>
                </div>
            </div>

            {/* Manage Categories Modal */}
            {isManagingCategories && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-100">Manage Labor Categories</h3>
                            <button onClick={() => setIsManagingCategories(false)} className="text-slate-400 hover:text-slate-200">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-6 space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Existing Categories</div>
                            {data.laborCategories.map(cat => (
                                <div key={cat.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    {editingCategory?.id === cat.id ? (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                                                    value={editingCategory.name}
                                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    className="w-24 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                                                    value={editingCategory.baseRate}
                                                    onChange={e => setEditingCategory({ ...editingCategory, baseRate: e.target.value })}
                                                />
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                                        checked={editingCategory.isOvertimeEligible}
                                                        onChange={e => setEditingCategory({ ...editingCategory, isOvertimeEligible: e.target.checked })}
                                                    />
                                                    <span className="text-sm text-slate-300">OT</span>
                                                </label>
                                                <div className="flex-1 flex justify-end gap-2">
                                                    <button onClick={handleUpdateCategory} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Save</button>
                                                    <button onClick={() => setEditingCategory(null)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded">Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-slate-200">{cat.name}</div>
                                                <div className="text-xs text-slate-500">Rate: ${cat.baseRate}/hr • {cat.isOvertimeEligible ? 'OT Eligible' : 'No OT'}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setEditingCategory(cat)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded transition-colors">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                            <div className="text-sm font-medium text-slate-300">Add New Category</div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="e.g. Field Technician"
                                        value={newCategory.name}
                                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Base Rate ($/hr)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="0.00"
                                            value={newCategory.baseRate}
                                            onChange={e => setNewCategory({ ...newCategory, baseRate: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                                checked={newCategory.isOvertimeEligible}
                                                onChange={e => setNewCategory({ ...newCategory, isOvertimeEligible: e.target.checked })}
                                            />
                                            <span className="text-sm text-slate-300">OT Eligible</span>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCreateCategory}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                                >
                                    Add Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                {activeTab === 'deployment' ? <DeploymentPlanning /> : <OverheadPlanning />}
            </div>
        </div>
    );
}

function DeploymentPlanning() {
    const { data, updateDeployment } = useStore();
    const activeDeployments = data.deployments.filter(d => d.status !== 'Archived');
    const [selectedId, setSelectedId] = useState(activeDeployments[0]?.id || '');

    const selectedDeployment = activeDeployments.find(d => d.id === selectedId);

    const updatePlan = (section, newSegments) => {
        if (!selectedDeployment) return;
        const currentPlan = selectedDeployment.laborPlan || { pre: [], during: [], post: [] };
        updateDeployment(selectedId, {
            laborPlan: {
                ...currentPlan,
                [section]: newSegments
            }
        });
    };

    if (activeDeployments.length === 0) {
        return <div className="text-slate-500 text-center mt-20">No active deployments found.</div>;
    }

    const getDates = (section, duration, offset) => {
        if (!selectedDeployment) return '';
        const start = parseISO(selectedDeployment.startDate);
        const end = selectedDeployment.endDate ? parseISO(selectedDeployment.endDate) : null;

        if (section === 'pre') {
            const endDate = addDays(start, -offset);
            const startDate = addDays(endDate, -duration);
            return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
        }
        if (section === 'post' && end) {
            const startDate = addDays(end, offset);
            const endDate = addDays(startDate, duration);
            return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
        }
        return '';
    };

    // Calculate Chart Data
    const chartData = useMemo(() => {
        if (!selectedDeployment) return [];

        const laborCategories = data.laborCategories || [];
        const depStart = parseISO(selectedDeployment.startDate);
        // If undefined end date, default to 6 months out for visualization
        const depEnd = selectedDeployment.endDate ? parseISO(selectedDeployment.endDate) : addMonths(depStart, 6);

        const buckets = {};

        // Helper: Initialize bucket if missing
        const ensureBucket = (date) => {
            const key = format(date, 'yyyy-MM');
            if (!buckets[key]) {
                buckets[key] = {
                    date: startOfMonth(date),
                    name: format(date, 'MMM yy'),
                    total: 0
                };
                laborCategories.forEach(c => buckets[key][c.name] = 0);
            }
            return key;
        };

        // 1. Process Pre-Deployment
        (selectedDeployment.laborPlan?.pre || []).forEach(seg => {
            const cat = laborCategories.find(c => c.id === seg.categoryId);
            if (!cat) return;
            // logic: end = depStart - offset, start = end - duration
            const segEnd = addDays(depStart, -(seg.offset || 0));
            const segStart = addDays(segEnd, -(seg.duration || 0));

            // Safety check for valid dates
            if (seg.duration > 0) {


                const actualStart = addDays(segEnd, -(seg.duration - 1));
                const days = eachDayOfInterval({ start: actualStart, end: segEnd });

                days.forEach(day => {
                    const key = ensureBucket(day);
                    buckets[key][cat.name] = (buckets[key][cat.name] || 0) + (seg.hours || 0);
                });
            }
        });

        // 2. Process During Deployment
        (selectedDeployment.laborPlan?.during || []).forEach(seg => {
            const cat = laborCategories.find(c => c.id === seg.categoryId);
            if (!cat) return;
            if (!selectedDeployment.endDate && isBefore(depStart, addMonths(new Date(), -120))) return; // Safety for bad dates

            // Interval: depStart to depEnd
            try {
                const days = eachDayOfInterval({ start: depStart, end: depEnd });
                days.forEach(day => {
                    const key = ensureBucket(day);
                    buckets[key][cat.name] = (buckets[key][cat.name] || 0) + (seg.hours || 0);
                });
            } catch (e) { console.warn("Invalid interval for chart", e); }
        });

        // 3. Process Post-Deployment
        if (selectedDeployment.endDate) {
            (selectedDeployment.laborPlan?.post || []).forEach(seg => {
                const cat = laborCategories.find(c => c.id === seg.categoryId);
                if (!cat) return;
                // Start = depEnd + offset
                // End = start + duration - 1
                const segStart = addDays(depEnd, (seg.offset || 0));
                if (seg.duration > 0) {
                    const segEnd = addDays(segStart, (seg.duration - 1));
                    try {
                        const days = eachDayOfInterval({ start: segStart, end: segEnd });
                        days.forEach(day => {
                            const key = ensureBucket(day);
                            buckets[key][cat.name] = (buckets[key][cat.name] || 0) + (seg.hours || 0);
                        });
                    } catch (e) { console.warn("Invalid interval for chart", e); }
                }
            });
        }

        return Object.values(buckets).sort((a, b) => a.date - b.date);

    }, [selectedDeployment, data.laborCategories, data.deployments]); // Add data.deployments to trigger recalc on updates

    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    return (
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shrink-0 sticky top-0 z-10 shadow-md backdrop-blur-sm bg-opacity-95">
                <label className="text-sm font-medium text-slate-300">Select Deployment:</label>
                <select
                    className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                >
                    {activeDeployments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                {selectedDeployment && (
                    <div className="text-sm text-slate-500 ml-auto">
                        {format(parseISO(selectedDeployment.startDate), 'MMM d, yyyy')} - {selectedDeployment.endDate ? format(parseISO(selectedDeployment.endDate), 'MMM d, yyyy') : 'Ongoing'}
                    </div>
                )}
            </div>

            {selectedDeployment && (
                <>
                    {/* Chart Area */}
                    <div className="h-[400px] bg-slate-900 rounded-xl border border-slate-800 p-4 shrink-0 flex flex-col shadow-sm">
                        <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wide">Labor Profile (Hours / Month)</h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        {data.laborCategories.map((cat, index) => (
                                            <linearGradient key={cat.id} id={`color${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <XAxis dataKey="name" stroke="#64748b" fileName="12px" tick={{ fill: '#64748b' }} />
                                    <YAxis stroke="#64748b" fontSize="12px" tick={{ fill: '#64748b' }} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    {data.laborCategories.map((cat, index) => (
                                        <Area
                                            key={cat.id}
                                            type="monotone"
                                            dataKey={cat.name}
                                            stackId="1"
                                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                            fill={`url(#color${cat.id})`}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-6 pb-8">
                        <PlanSection
                            title="Pre-Deployment"
                            color="border-l-yellow-500"
                            segments={selectedDeployment.laborPlan?.pre || []}
                            onChange={(s) => updatePlan('pre', s)}
                            showControls={true}
                            getDateLabel={(dur, off) => getDates('pre', dur, off)}
                        />
                        <PlanSection
                            title="Deployment"
                            color="border-l-blue-500"
                            segments={selectedDeployment.laborPlan?.during || []}
                            onChange={(s) => updatePlan('during', s)}
                            showControls={false}
                        />
                        <PlanSection
                            title="Post-Deployment"
                            color="border-l-green-500"
                            segments={selectedDeployment.laborPlan?.post || []}
                            onChange={(s) => updatePlan('post', s)}
                            showControls={true}
                            getDateLabel={(dur, off) => getDates('post', dur, off)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function PlanSection({ title, color, segments, onChange, showControls, getDateLabel }) {
    const { data } = useStore();
    const laborCategories = data.laborCategories || [];

    // Helper to update a specific segment
    const updateSegment = (id, updates) => {
        onChange(segments.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSegment = (id) => {
        onChange(segments.filter(s => s.id !== id));
    };

    const addSegment = () => {
        onChange([
            ...segments,
            {
                id: generateId(),
                categoryId: laborCategories.length > 0 ? laborCategories[0].id : '',
                hours: 8,
                isOvertimeEligible: false,
                duration: 14,
                offset: 1
            }
        ]);
    };

    return (
        <div className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm`}>
            <div className={`px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center border-l-4 ${color}`}>
                <h3 className="font-semibold text-slate-200">{title}</h3>
                <button onClick={addSegment} className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium">
                    <Plus className="h-3 w-3" /> Add Labor
                </button>
            </div>
            <div className="p-4 space-y-3">
                {segments.length === 0 && (
                    <div className="text-sm text-slate-500 italic text-center py-2">No labor planned.</div>
                )}
                {segments.map(seg => (
                    <div key={seg.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 relative group">
                        {/* Category */}
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Category</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                value={seg.categoryId}
                                onChange={e => updateSegment(seg.id, { categoryId: e.target.value })}
                            >
                                {laborCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Hours / Day */}
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Hours/Day</label>
                            <input
                                type="number"
                                min="0" step="0.5"
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                value={seg.hours}
                                onChange={e => updateSegment(seg.id, { hours: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Duration & Offset (Pre/Post Only) */}
                        {showControls ? (
                            <>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Duration (Days)</label>
                                    <input
                                        type="number" min="0"
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                        value={seg.duration}
                                        onChange={e => updateSegment(seg.id, { duration: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Offset (Days)</label>
                                    <div className="relative">
                                        <input
                                            type="number" min="0"
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            value={seg.offset}
                                            onChange={e => updateSegment(seg.id, { offset: parseInt(e.target.value) || 0 })}
                                        />
                                        {getDateLabel && (
                                            <span className="absolute left-0 -bottom-5 text-[10px] text-slate-500 truncate w-40">
                                                {getDateLabel(seg.duration, seg.offset)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="md:col-span-4 flex items-center">
                                <span className="text-xs text-slate-500 italic mt-4">Takes full deployment duration</span>
                            </div>
                        )}

                        {/* OT Toggle */}
                        <div className="md:col-span-2 flex items-center h-full pb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                    checked={seg.isOvertimeEligible}
                                    onChange={e => updateSegment(seg.id, { isOvertimeEligible: e.target.checked })}
                                />
                                <span className="text-xs text-slate-300 font-medium">OT Eligible</span>
                            </label>
                        </div>

                        {/* Remove */}
                        <div className="md:col-span-1 flex justify-end pb-1.5">
                            <button onClick={() => removeSegment(seg.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded disabled:opacity-50">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OverheadPlanning() {
    const { data, setOverhead } = useStore();
    const overheadData = data.overhead || [];
    const laborCategories = data.laborCategories || [];

    const addSegment = () => {
        const newSeg = {
            id: generateId(),
            categoryId: laborCategories[0]?.id || '',
            startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
            hours: 8
        };
        setOverhead([...overheadData, newSeg]);
    };

    const updateSegment = (id, updates) => {
        setOverhead(overheadData.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSegment = (id) => {
        setOverhead(overheadData.filter(s => s.id !== id));
    };

    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    // Calculate Chart Data for Overhead
    const { chartData, activeCategoryIds } = useMemo(() => {
        const buckets = {};
        const activeIds = new Set();

        const ensureBucket = (date) => {
            const key = format(date, 'yyyy-MM');
            if (!buckets[key]) {
                buckets[key] = {
                    date: startOfMonth(date),
                    name: format(date, 'MMM yy'),
                    total: 0
                };
                laborCategories.forEach(c => buckets[key][c.name] = 0);
            }
            return key;
        };

        overheadData.forEach(seg => {
            if (!seg.startDate || !seg.endDate || !seg.hours) return;
            const start = parseISO(seg.startDate);
            const end = parseISO(seg.endDate);
            const cat = laborCategories.find(c => c.id === seg.categoryId);

            if (cat && start <= end) {
                // Track active category
                if (seg.hours > 0) activeIds.add(cat.id);

                try {
                    const days = eachDayOfInterval({ start, end });
                    days.forEach(day => {
                        const key = ensureBucket(day);
                        buckets[key][cat.name] = (buckets[key][cat.name] || 0) + (seg.hours || 0);
                    });
                } catch (e) { console.warn("Invalid overhead interval", e); }
            }
        });

        return {
            chartData: Object.values(buckets).sort((a, b) => a.date - b.date),
            activeCategoryIds: activeIds
        };
    }, [overheadData, laborCategories]);

    return (
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shrink-0 sticky top-0 z-10 shadow-md backdrop-blur-sm bg-opacity-95">
                <h3 className="text-lg font-bold text-slate-100">Program Overhead</h3>
                <button
                    onClick={addSegment}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Add Period
                </button>
            </div>

            {/* Chart Area */}
            {chartData.length > 0 && (
                <div className="h-[400px] bg-slate-900 rounded-xl border border-slate-800 p-4 shrink-0 flex flex-col shadow-sm">
                    <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wide">Overhead Labor Profile (Hours / Month)</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    {laborCategories.map((cat, index) => (
                                        <linearGradient key={cat.id} id={`colorOverhead${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <XAxis dataKey="name" stroke="#64748b" fileName="12px" tick={{ fill: '#64748b' }} />
                                <YAxis stroke="#64748b" fontSize="12px" tick={{ fill: '#64748b' }} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {laborCategories.filter(cat => activeCategoryIds.has(cat.id)).map((cat, index) => (
                                    <Area
                                        key={cat.id}
                                        type="monotone"
                                        dataKey={cat.name}
                                        stackId="1"
                                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                        fill={`url(#colorOverhead${cat.id})`}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm p-4">
                {overheadData.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 italic">
                        No overhead periods defined. Add one to start planning.
                    </div>
                ) : (
                    <div className="space-y-3 pb-8">
                        {overheadData.map(seg => (
                            <div key={seg.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-950 p-4 rounded-lg border border-slate-800">
                                {/* Category */}
                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Category</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                        value={seg.categoryId}
                                        onChange={e => updateSegment(seg.id, { categoryId: e.target.value })}
                                    >
                                        {laborCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Start Date */}
                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                        value={seg.startDate}
                                        onChange={e => updateSegment(seg.id, { startDate: e.target.value })}
                                    />
                                </div>

                                {/* End Date */}
                                <div className="md:col-span-3 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                        value={seg.endDate}
                                        onChange={e => updateSegment(seg.id, { endDate: e.target.value })}
                                    />
                                </div>

                                {/* Hours */}
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Hours/Day</label>
                                    <input
                                        type="number" min="0" step="0.5"
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                                        value={seg.hours}
                                        onChange={e => updateSegment(seg.id, { hours: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                {/* Delete */}
                                <div className="md:col-span-1 flex justify-end pb-1.5">
                                    <button onClick={() => removeSegment(seg.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
