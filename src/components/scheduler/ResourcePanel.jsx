import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function ResourcePanel() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch monthly labor stats
        // The endpoint /api/stats/monthly-labor returns { "2024-01": { "cat1": 100, "cat2": 50 } }
        // We need to transform this for Recharts
        fetch('http://localhost:8000/api/stats/monthly-labor')
            .then(res => res.json())
            .then(stats => {
                const chartData = Object.entries(stats).map(([month, cats]) => {
                    return {
                        name: month,
                        ...cats
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));
                setData(chartData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    // Dynamically find keys (resources/categories)
    const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : [];

    return (
        <div className="h-full bg-slate-950 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Resource Utilization</h2>
            <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                            itemStyle={{ color: '#cbd5e1' }}
                        />
                        <Legend />
                        {keys.map((key, idx) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="a"
                                fill={`hsl(${idx * 40}, 70%, 50%)`}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
