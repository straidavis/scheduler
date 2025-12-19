import { useStore } from '../store';
import { aggregateMonthlyHours } from '../lib/calc';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plane, Users, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
    const { data } = useStore();

    const monthlyData = aggregateMonthlyHours(data.laborEntries, data.laborCategories);

    // Transform for Recharts
    const chartData = Object.entries(monthlyData).map(([month, categories]) => {
        const entry = { name: month };
        Object.entries(categories).forEach(([catId, hours]) => {
            const cat = data.laborCategories.find(c => c.id === catId);
            if (cat) {
                entry[cat.name] = hours;
            }
        });
        return entry;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2'];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
                <p className="text-slate-400">Overview of deployments and labor metrics.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400">
                            <Plane className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-green-400 bg-green-900/30 px-2 py-1 rounded-full">+2 Active</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{data.deployments.filter(d => d.status !== 'Archived').length}</div>
                    <div className="text-sm text-slate-400">Active Deployments</div>
                </div>

                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400">
                            <Clock className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">
                        {data.laborEntries.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-400">Total Hours Logged</div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-100 mb-6">Monthly Labor Hours (Equivalent)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f1f5f9' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                            <Legend />
                            {data.laborCategories.map((cat, index) => (
                                <Bar
                                    key={cat.id}
                                    dataKey={cat.name}
                                    stackId="a"
                                    fill={colors[index % colors.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
