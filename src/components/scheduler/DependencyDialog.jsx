import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DependencyDialog({ isOpen, onClose, items, onSave }) {
    const [predId, setPredId] = useState('');
    const [succId, setSuccId] = useState('');
    const [type, setType] = useState('FS');
    const [lag, setLag] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!predId || !succId) return;
        if (predId === succId) return;

        onSave({
            predecessorId: predId,
            successorId: succId,
            type,
            lagMinutes: parseInt(lag)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-96 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-100">Add Dependency</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Predecessor</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                            value={predId}
                            onChange={e => setPredId(e.target.value)}
                        >
                            <option value="">Select Task...</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Successor</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                            value={succId}
                            onChange={e => setSuccId(e.target.value)}
                        >
                            <option value="">Select Task...</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="FS">Finish-to-Start (FS)</option>
                                <option value="SS">Start-to-Start (SS)</option>
                                <option value="FF">Finish-to-Finish (FF)</option>
                                <option value="SF">Start-to-Finish (SF)</option>
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Lag (mins)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                                value={lag}
                                onChange={e => setLag(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium"
                        >
                            Create Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
