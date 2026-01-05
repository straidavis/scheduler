import { useState } from 'react';
import { useStore } from '../store';
import { Save, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Pricing() {
    const { data, updatePricing } = useStore();
    const [isLocked, setIsLocked] = useState(true);
    // Local state for editing form
    const [localPricing, setLocalPricing] = useState(data.pricing);

    const periods = ["1", "2", "3", "4", "5"];
    const rows = [
        { key: 'land15', label: 'Land Site CLIN (15-Day)' },
        { key: 'landOA', label: 'Land Site Over & Above' },
        { key: 'ship15', label: 'Ship CLIN (15-Day)' },
        { key: 'ship1', label: 'Ship CLIN (1-Day)' },
    ];

    const handleCellChange = (period, rowKey, value) => {
        setLocalPricing(prev => ({
            ...prev,
            [period]: {
                ...prev[period],
                [rowKey]: value
            }
        }));
    };

    const handleSave = () => {
        // Bulk update store
        Object.entries(localPricing).forEach(([period, values]) => {
            updatePricing(period, values);
        });
        setIsLocked(true);
        alert('Pricing updated via local store!');
    };

    const toggleLock = () => {
        if (isLocked) {
            setIsLocked(false);
            setLocalPricing(data.pricing); // Sync starting state
        } else {
            // Cancel/Lock without saving? Or strictly explicit save.
            setIsLocked(true);
            setLocalPricing(data.pricing); // Revert
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Pricing Matrix</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage CLIN pricing for Ordering Periods.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    )}
                    <button
                        onClick={toggleLock}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium border shadow-sm",
                            isLocked
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                        )}
                    >
                        {isLocked ? <><Lock size={18} /> Unlock</> : <><Unlock size={18} /> Cancel</>}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-1/4">Pricing Element</th>
                                {periods.map(p => (
                                    <th key={p} className="px-6 py-4 text-center">Ordering Period {p}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                            {rows.map(row => (
                                <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium">{row.label}</td>
                                    {periods.map(p => (
                                        <td key={p} className="px-4 py-3">
                                            <div className="relative max-w-[120px] mx-auto">
                                                <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                <input
                                                    type="number"
                                                    disabled={isLocked}
                                                    value={localPricing[p]?.[row.key] || ''}
                                                    onChange={(e) => handleCellChange(p, row.key, e.target.value)}
                                                    className={cn(
                                                        "w-full pl-6 p-2 rounded-lg border text-right transition-all outline-none focus:ring-2",
                                                        isLocked
                                                            ? "bg-transparent border-transparent text-slate-600 dark:text-slate-400 cursor-default"
                                                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                                                    )}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
