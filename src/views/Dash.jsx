import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addMonths, isBefore } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plane, Users, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
    const { data } = useStore();
    const chartData = useMemo(() => {
        const buckets = {};
        const laborCategories = data.laborCategories || [];
        const deployments = data.deployments || [];
        const overheadData = data.overhead || [];

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

        const addToBucket = (day, catId, hours) => {
            const cat = laborCategories.find(c => c.id === catId);
            if (!cat) return;
            const key = ensureBucket(day);
            buckets[key][cat.name] = (buckets[key][cat.name] || 0) + (hours || 0);
            buckets[key].total += (hours || 0);
        };

        // 1. Process Deployments
        deployments.forEach(d => {
            if (d.status === 'Archived') return;
            const depStart = parseISO(d.startDate);
            const depEnd = d.endDate ? parseISO(d.endDate) : addMonths(depStart, 6); // visual default 

            // Pre
            (d.laborPlan?.pre || []).forEach(seg => {
                if (!seg.duration) return;
                const segEnd = addDays(depStart, -(seg.offset || 0));
                const segStart = addDays(segEnd, -(seg.duration - 1));
                try {
                    eachDayOfInterval({ start: segStart, end: segEnd })
                        .forEach(day => addToBucket(day, seg.categoryId, seg.hours));
                } catch (e) { }
            });

            // During
            (d.laborPlan?.during || []).forEach(seg => {
                if (!d.endDate && isBefore(depStart, addMonths(new Date(), -120))) return;
                try {
                    eachDayOfInterval({ start: depStart, end: depEnd })
                        .forEach(day => addToBucket(day, seg.categoryId, seg.hours));
                } catch (e) { }
            });

            // Post
            if (d.endDate) {
                (d.laborPlan?.post || []).forEach(seg => {
                    if (!seg.duration) return;
                    const segStart = addDays(depEnd, (seg.offset || 0));
                    const segEnd = addDays(segStart, (seg.duration - 1));
                    try {
                        eachDayOfInterval({ start: segStart, end: segEnd })
                            .forEach(day => addToBucket(day, seg.categoryId, seg.hours));
                    } catch (e) { }
                });
            }
        });

        // 2. Process Overhead
        overheadData.forEach(seg => {
            if (!seg.startDate || !seg.endDate || !seg.hours) return;
            try {
                eachDayOfInterval({ start: parseISO(seg.startDate), end: parseISO(seg.endDate) })
                    .forEach(day => addToBucket(day, seg.categoryId, seg.hours));
            } catch (e) { }
        });

        return Object.values(buckets).sort((a, b) => a.date - b.date);

    }, [data.deployments, data.overhead, data.laborCategories]);

    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                {data.laborCategories.map((cat, index) => (
                                    <linearGradient key={cat.id} id={`colorDash${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize="12px" tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="#94a3b8" fontSize="12px" tick={{ fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                            <Legend />
                            {data.laborCategories.map((cat, index) => (
                                <Area
                                    key={cat.id}
                                    type="monotone"
                                    dataKey={cat.name}
                                    stackId="1"
                                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                    fill={`url(#colorDash${cat.id})`}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
