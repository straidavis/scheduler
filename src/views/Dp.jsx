import { useState } from 'react';
import { useStore } from '../s';
import { generateId, cn } from '../lib/utils';
import { Plus, Calendar as CalendarIcon, MapPin, Anchor } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Deployments() {
    const { data, addDeployment, updateDeployment } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newDeployment, setNewDeployment] = useState({
        name: '',
        type: 'Land', // Land or Ship
        startDate: '',
        endDate: '',
        fiscalYear: 2025
    });

    const handleAdd = () => {
        if (!newDeployment.name || !newDeployment.startDate) return;

        addDeployment({
            ...newDeployment,
            id: generateId(),
            status: 'Active'
        });

        setNewDeployment({
            name: '',
            type: 'Land',
            startDate: '',
            endDate: '',
            fiscalYear: 2025
        });
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Deployments</h2>
                    <p className="text-gray-500">Manage deployment events and tracking.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    New Deployment
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">New Deployment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Deployment Name</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="e.g., Operation Deep Blue"
                                value={newDeployment.name}
                                onChange={e => setNewDeployment({ ...newDeployment, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Type</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setNewDeployment({ ...newDeployment, type: 'Land' })}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all",
                                        newDeployment.type === 'Land'
                                            ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                                            : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <MapPin className="h-4 w-4" />
                                    Land Based
                                </button>
                                <button
                                    onClick={() => setNewDeployment({ ...newDeployment, type: 'Ship' })}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all",
                                        newDeployment.type === 'Ship'
                                            ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                                            : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <Anchor className="h-4 w-4" />
                                    Ship Based
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Start Date</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newDeployment.startDate}
                                onChange={e => setNewDeployment({ ...newDeployment, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newDeployment.endDate}
                                onChange={e => setNewDeployment({ ...newDeployment, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                        >
                            Create Deployment
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {data.deployments.map((deployment) => (
                    <div key={deployment.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{deployment.name}</h3>
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                                        deployment.type === 'Land' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                        {deployment.type === 'Land' ? <MapPin className="h-3 w-3" /> : <Anchor className="h-3 w-3" />}
                                        {deployment.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="h-4 w-4" />
                                        {format(parseISO(deployment.startDate), 'MMM d, yyyy')}{deployment.endDate && ` - ${format(parseISO(deployment.endDate), 'MMM d, yyyy')}`}
                                    </div>
                                    <div>FY {deployment.fiscalYear}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                            </div>
                        </div>
                    </div>
                ))}

                {data.deployments.length === 0 && !isAdding && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Plane className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No deployments yet</h3>
                        <p className="text-gray-500">Create your first deployment to start tracking.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
