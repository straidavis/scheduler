import { useState, useEffect } from 'react';
import { useStore } from '../store';
// import { generateBillingItems } from '../lib/bill';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { FileText, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Billing() {
    const { data, updateBillingItem, bulkUpdateBillingItems } = useStore();
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [bulkInvoiceNum, setBulkInvoiceNum] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        deployment: '',
        type: '',
        status: '',
        invoiceNumber: ''
    });

    const [items, setItems] = useState([]);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/billing-items');
                if (res.ok) {
                    const json = await res.json();
                    setItems(json);
                }
            } catch (e) {
                console.error("Failed to fetch billing items", e);
            }
        };
        fetchItems();
    }, [data.deployments]); // Re-fetch if deployments change

    // Enrich items with invoice data
    const enrichedItems = items.map(item => {
        const state = data.billingState[item.id] || {};
        const invoice = data.invoices.find(inv => inv.invoiceNumber === state.invoiceNumber);

        return {
            ...item,
            status: state.status || (isBefore(parseISO(item.endDate), startOfDay(new Date())) ? 'Complete' : 'Pending'),
            invoiceNumber: state.invoiceNumber || '',
            dateInvoiced: invoice?.dateInvoiced || '',
            datePaid: invoice?.datePaid || ''
        };
    });

    // Apply Filters
    const filteredItems = enrichedItems.filter(item => {
        if (filters.deployment && !item.deploymentName.toLowerCase().includes(filters.deployment.toLowerCase())) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.invoiceNumber && !item.invoiceNumber.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
        return true;
    });

    const handleStatusChange = (id, status) => {
        updateBillingItem(id, { status });
    };

    const handleInvoiceChange = (id, invoiceNumber) => {
        updateBillingItem(id, { invoiceNumber });
    };

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleBulkAssign = () => {
        if (!bulkInvoiceNum) {
            alert('Please enter an invoice number');
            return;
        }
        bulkUpdateBillingItems(Array.from(selectedItems), {
            invoiceNumber: bulkInvoiceNum,
            status: 'Invoiced'
        });
        setSelectedItems(new Set());
        setBulkInvoiceNum('');
        alert('Invoices assigned!');
    };

    const exportCSV = () => {
        const headers = ['Deployment', 'Type', 'Start Date', 'End Date', 'Amount', 'Status', 'Invoice Number', 'Date Invoiced', 'Date Paid'];
        const rows = filteredItems.map(item => {
            return [
                item.deploymentName,
                item.type,
                format(parseISO(item.startDate), 'yyyy-MM-dd'),
                format(parseISO(item.endDate), 'yyyy-MM-dd'),
                item.amount,
                item.status,
                item.invoiceNumber,
                item.dateInvoiced,
                item.datePaid
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `billing_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Billing & Invoices</h2>
                    <p className="text-slate-400">Track deployment costs and invoice statuses.</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 font-medium shadow-sm transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Export Filtered CSV
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                <input
                    type="text"
                    placeholder="Filter Deployment..."
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-slate-600"
                    value={filters.deployment}
                    onChange={e => setFilters({ ...filters, deployment: e.target.value })}
                />
                <select
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={filters.type}
                    onChange={e => setFilters({ ...filters, type: e.target.value })}
                >
                    <option value="">All Types</option>
                    <option value="15-Day CLIN">15-Day CLIN</option>
                    <option value="Daily Rate">Daily Rate</option>
                    <option value="Over & Above">Over & Above</option>
                </select>
                <select
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Complete">Complete</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Paid">Paid</option>
                </select>
                <input
                    type="text"
                    placeholder="Filter Invoice #..."
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-slate-600"
                    value={filters.invoiceNumber}
                    onChange={e => setFilters({ ...filters, invoiceNumber: e.target.value })}
                />
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedItems.size > 0 && (
                <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-blue-400 font-medium">
                        <CheckCircle className="h-5 w-5" />
                        {selectedItems.size} items selected
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Assign Invoice #"
                            className="px-3 py-2 rounded-lg bg-slate-950 border border-blue-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                            value={bulkInvoiceNum}
                            onChange={(e) => setBulkInvoiceNum(e.target.value)}
                        />
                        <button
                            onClick={handleBulkAssign}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                        >
                            Assign Invoice
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3">Deployment</th>
                                <th className="px-6 py-3">CLIN Type</th>
                                <th className="px-6 py-3">Period</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Invoice #</th>
                                <th className="px-6 py-3">Date Invoiced</th>
                                <th className="px-6 py-3">Date Paid</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredItems.map((item) => {
                                const isSelected = selectedItems.has(item.id);

                                return (
                                    <tr key={item.id} className={cn(
                                        "transition-colors",
                                        isSelected ? "bg-blue-900/20" :
                                            item.status === 'Paid' ? "bg-green-900/10 hover:bg-green-900/20" :
                                                item.status === 'Invoiced' ? "bg-blue-900/10 hover:bg-blue-900/20" :
                                                    "hover:bg-slate-800/50"
                                    )}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {item.deploymentName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                item.type === '15-Day CLIN' ? "bg-blue-900/30 text-blue-400" :
                                                    item.type === 'Daily Rate' ? "bg-purple-900/30 text-purple-400" :
                                                        "bg-orange-900/30 text-orange-400"
                                            )}>
                                                {item.type}
                                            </span>
                                            {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {format(parseISO(item.startDate), 'MMM d')} - {format(parseISO(item.endDate), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-200">
                                            ${item.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className={cn(
                                                    "px-2 py-1 rounded-md text-xs font-medium border-0 ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-blue-600 w-full bg-transparent",
                                                    item.status === 'Paid' ? "bg-green-900/30 text-green-400 ring-green-800" :
                                                        item.status === 'Invoiced' ? "bg-blue-900/30 text-blue-400 ring-blue-800" :
                                                            item.status === 'Complete' ? "bg-slate-800 text-slate-400 ring-slate-700" :
                                                                "bg-yellow-900/30 text-yellow-400 ring-yellow-800"
                                                )}
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                            >
                                                <option value="Pending" className="bg-slate-900 text-slate-200">Pending</option>
                                                <option value="Complete" className="bg-slate-900 text-slate-200">Complete</option>
                                                <option value="Invoiced" className="bg-slate-900 text-slate-200">Invoiced</option>
                                                <option value="Paid" className="bg-slate-900 text-slate-200">Paid</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                placeholder="Invoice #"
                                                className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                                                value={item.invoiceNumber}
                                                onChange={(e) => handleInvoiceChange(item.id, e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {item.dateInvoiced ? format(parseISO(item.dateInvoiced), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {item.datePaid ? format(parseISO(item.datePaid), 'MMM d, yyyy') : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                                        No billing items found matching filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
