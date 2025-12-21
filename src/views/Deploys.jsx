// Deployments.jsx - Updated with ordering period and CLIN price, edit functionality - HMR Force Update
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { generateId, cn } from '../lib/utils';
import { getFiscalYear, getOrderingPeriod } from '../lib/dateUtils';
import { Plus, Calendar as CalendarIcon, MapPin, Anchor, Trash } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';

export default function Deployments() {
    const { data, addDeployment, updateDeployment, deleteDeployment } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const emptyDeployment = {
        name: '',
        type: 'Land', // Land or Shore
        startDate: '',
        endDate: '',
        fiscalYear: '',
        orderingPeriodStart: '',
        orderingPeriodEnd: '',
        clinPrice: '',
        laborPlanningMode: 'relative', // 'relative' or 'dates'
        laborDaysAfter: 0,
        laborStartDate: '',
        laborEndDate: '',
        clinPriceSingle: '',
        clinPrice15: '',
        clinPriceOverAbove: ''
    };
    const [newDeployment, setNewDeployment] = useState({ ...emptyDeployment });

    // Auto-populate Fiscal Year and Ordering Period when Start Date changes
    // Auto-populate Fiscal Year and Ordering Period when Start Date changes
    useEffect(() => {
        if (!newDeployment.startDate) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/calculate-date-info?date=${newDeployment.startDate}`);
                if (res.ok) {
                    const info = await res.json();
                    setNewDeployment(prev => ({
                        ...prev,
                        fiscalYear: info.fiscalYear,
                        orderingPeriodStart: info.orderingPeriod ? info.orderingPeriod.start : prev.orderingPeriodStart,
                        orderingPeriodEnd: info.orderingPeriod ? info.orderingPeriod.end : prev.orderingPeriodEnd
                    }));
                }
            } catch (e) {
                console.error("Failed to fetch date info", e);
            }
        };
        fetchData();
    }, [newDeployment.startDate]);

    const handleSave = () => {
        if (!newDeployment.name || !newDeployment.startDate) {
            alert('Please fill in Name and Start Date');
            return;
        }

        // Status Protection Warning
        if (editingId) {
            const original = data.deployments.find(d => d.id === editingId);
            if (original) {
                const status = getComputedStatus(original.startDate, original.endDate);
                if (status === 'Started' && original.startDate !== newDeployment.startDate) {
                    if (!confirm("⚠️ Warning: This deployment has alread started.\n\nChanging the start date may affect existing billing cycles and labor history. Are you sure you want to proceed?")) {
                        return;
                    }
                }
            }
        }

        // Labor Planning Validation
        if (newDeployment.laborPlanningMode === 'dates') {
            if (!newDeployment.laborStartDate || !newDeployment.laborEndDate) {
                alert('Please select Labor Start and End Dates');
                return;
            }
            if (newDeployment.laborStartDate > newDeployment.laborEndDate) {
                alert('Labor Start Date cannot be after Labor End Date');
                return;
            }
        } else {
            // Relative mode validation
            if (newDeployment.laborDaysBefore < 0 || newDeployment.laborDaysAfter < 0) {
                alert('Buffer days cannot be negative');
                return;
            }
        }

        const payload = { ...newDeployment, status: 'Active' };
        if (editingId) {
            updateDeployment(editingId, payload);
        } else {
            addDeployment({ ...payload, id: generateId() });
        }
        // reset form
        setNewDeployment({ ...emptyDeployment });
        setEditingId(null);
        setIsAdding(false);
    };

    const startEdit = (deployment) => {
        setEditingId(deployment.id);
        setNewDeployment({
            name: deployment.name,
            type: deployment.type,
            startDate: deployment.startDate,
            endDate: deployment.endDate || '',
            fiscalYear: deployment.fiscalYear,
            orderingPeriodStart: deployment.orderingPeriodStart || '',
            orderingPeriodEnd: deployment.orderingPeriodEnd || '',
            clinPrice: deployment.clinPrice || '',
            laborPlanningMode: deployment.laborPlanningMode || 'relative',
            laborDaysAfter: deployment.laborDaysAfter || 0,
            laborStartDate: deployment.laborStartDate || '',
            laborEndDate: deployment.laborEndDate || '',
            clinPriceSingle: deployment.clinPriceSingle || '',
            clinPrice15: deployment.clinPrice15 || '',
            clinPriceOverAbove: deployment.clinPriceOverAbove || ''
        });
        setIsAdding(true);
    };

    function Plane({ className }) {
        return (
            <svg
                className={className}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M2 12h20" />
                <path d="M13 2l9 10-9 10" />
            </svg>
        );
    }

    const getComputedStatus = (start, end) => {
        if (!start) return 'Draft';
        const now = startOfDay(new Date());
        const s = startOfDay(parseISO(start));

        if (isBefore(now, s)) return 'Planned';

        if (end) {
            const e = startOfDay(parseISO(end));
            if (isAfter(now, e)) return 'Completed';
        }
        return 'Started';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Deployments</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage deployment schedules and details</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    {isAdding ? 'Cancel' : <><Plus size={20} /> New Deployment</>}
                </button>
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-slate-100">
                        {editingId ? 'Edit Deployment' : 'New Deployment Details'}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">General Info</h3>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Deployment Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={newDeployment.name}
                                    onChange={e => setNewDeployment({ ...newDeployment, name: e.target.value })}
                                    placeholder="e.g., PACIFIC-25-01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Type</label>
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                    {['Land', 'Shore'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNewDeployment({ ...newDeployment, type })}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                                newDeployment.type === type
                                                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                            )}
                                        >
                                            {type === 'Land' ? <MapPin size={16} /> : <Anchor size={16} />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Schedule</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newDeployment.startDate}
                                        onChange={e => setNewDeployment({ ...newDeployment, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newDeployment.endDate}
                                        onChange={e => setNewDeployment({ ...newDeployment, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Fiscal Year</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                        value={newDeployment.fiscalYear}
                                        readOnly
                                        placeholder="Auto"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Ordering Period</label>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        {newDeployment.orderingPeriodStart && newDeployment.orderingPeriodEnd ?
                                            `${newDeployment.orderingPeriodStart} - ${newDeployment.orderingPeriodEnd}` : 'Auto-populated'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financials</h3>

                            {/* Shore Only: Single Day CLIN */}
                            {newDeployment.type === 'Shore' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">CLIN Price (Single Day)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-7 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newDeployment.clinPriceSingle}
                                            onChange={e => setNewDeployment({ ...newDeployment, clinPriceSingle: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Both: 15-Day CLIN */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">CLIN Price (15-Day)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-7 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newDeployment.clinPrice15}
                                        onChange={e => setNewDeployment({ ...newDeployment, clinPrice15: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Land Only: Over & Above */}
                            {newDeployment.type === 'Land' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Over & Above (Daily Cap)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-7 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newDeployment.clinPriceOverAbove}
                                            onChange={e => setNewDeployment({ ...newDeployment, clinPriceOverAbove: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            {editingId ? 'Update Deployment' : 'Create Deployment'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {data.deployments.map(d => (
                    <div key={d.id} className="group bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-lg",
                                    d.type === 'Land' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                )}>
                                    {d.type === 'Land' ? <MapPin size={24} /> : <Anchor size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{d.name}</h3>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon size={14} />
                                            {d.startDate} — {d.endDate || 'Ongoing'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                                            FY{d.fiscalYear}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-semibold border",
                                    (() => {
                                        const status = getComputedStatus(d.startDate, d.endDate);
                                        switch (status) {
                                            case 'Started': return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
                                            case 'Completed': return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
                                            default: return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
                                        }
                                    })()
                                )}>
                                    {getComputedStatus(d.startDate, d.endDate)}
                                </span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(d)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this deployment?')) {
                                                deleteDeployment(d.id);
                                            }
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {data.deployments.length === 0 && !isAdding && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <Plane className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-lg font-medium">No deployments yet</p>
                        <p className="text-sm">Create your first deployment to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
