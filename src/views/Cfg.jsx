import { useState } from 'react';
import { useStore } from '../store';
import { generateId } from '../lib/utils';
import { cn } from '../lib/utils';
import { Plus, Save } from 'lucide-react';

export default function Settings() {
    const { data, addLaborCategory, updateLaborCategory } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', baseRate: 0, isOvertimeEligible: false });

    const handleAdd = () => {
        if (!newCategory.name) return;
        addLaborCategory({ ...newCategory, id: generateId() });
        setNewCategory({ name: '', baseRate: 0, isOvertimeEligible: false });
        setIsAdding(false);
    };

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', baseRate: 0, isOvertimeEligible: false });

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditForm({ name: cat.name, baseRate: cat.baseRate, isOvertimeEligible: cat.isOvertimeEligible });
    };

    const handleUpdate = () => {
        if (!editForm.name) return;
        updateLaborCategory(editingId, editForm);
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
                <p className="text-slate-400">Manage labor categories and system configurations.</p>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-100">Labor Categories</h3>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Add Category
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Base Rate ($)</th>
                                <th className="px-6 py-3">Overtime Eligible</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isAdding && (
                                <tr className="bg-blue-900/20">
                                    <td className="px-6 py-3">
                                        <input
                                            type="text"
                                            placeholder="Category Name"
                                            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
                                            value={newCategory.name}
                                            onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="number"
                                            className="w-32 px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newCategory.baseRate}
                                            onChange={e => setNewCategory({ ...newCategory, baseRate: Number(e.target.value) })}
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 rounded border-slate-700 bg-slate-950 focus:ring-blue-500 focus:ring-offset-slate-900"
                                            checked={newCategory.isOvertimeEligible}
                                            onChange={e => setNewCategory({ ...newCategory, isOvertimeEligible: e.target.checked })}
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button
                                            onClick={handleAdd}
                                            className="text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {data.laborCategories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-slate-800/50">
                                    {editingId === cat.id ? (
                                        <>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    className="w-32 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editForm.baseRate}
                                                    onChange={e => setEditForm({ ...editForm, baseRate: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 rounded border-slate-700 bg-slate-950 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                    checked={editForm.isOvertimeEligible}
                                                    onChange={e => setEditForm({ ...editForm, isOvertimeEligible: e.target.checked })}
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-right space-x-2">
                                                <button onClick={handleUpdate} className="text-blue-400 hover:text-blue-300 font-medium">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 font-medium">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-3 font-medium text-slate-200">{cat.name}</td>
                                            <td className="px-6 py-3 text-slate-400">${cat.baseRate.toFixed(2)}</td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    cat.isOvertimeEligible
                                                        ? "bg-green-900/30 text-green-400"
                                                        : "bg-slate-800 text-slate-400"
                                                )}>
                                                    {cat.isOvertimeEligible ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => startEdit(cat)}
                                                    className="text-blue-400 hover:text-blue-300 font-medium"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
