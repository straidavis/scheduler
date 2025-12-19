import { useState, useRef } from 'react';
import { useStore } from '../store';
import { generateId, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { Plus, FileText, CheckCircle, Clock, Trash, Edit2, X, Paperclip, Upload, MinusCircle } from 'lucide-react';
import { generateBillingItems } from '../lib/bill';

export default function Invoices() {
    const { data, addInvoice, updateInvoice, deleteInvoice, bulkUpdateBillingItems } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedBillingItems, setSelectedBillingItems] = useState(new Set());
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        dateInvoiced: format(new Date(), 'yyyy-MM-dd'),
        datePaid: '',
        status: 'Pending',
        notes: '',
        attachments: [] // { name, size, date, type }
    });

    // Get all billing items to allow selection for new invoice
    const allBillingItems = data.deployments.flatMap(d => {
        const rates = {
            period15DayRate: parseFloat(d.clinPrice15) || 0,
            dailyRate: parseFloat(d.clinPriceSingle) || 0,
            overAndAboveRate: parseFloat(d.clinPriceOverAbove) || 0
        };
        return generateBillingItems(d, rates);
    });

    // Filter items that are NOT yet invoiced (or belong to the invoice being edited)
    const availableItems = allBillingItems.filter(item => {
        const state = data.billingState[item.id] || {};
        // If editing, include items already on this invoice
        if (editingId) {
            const invoice = data.invoices.find(inv => inv.id === editingId);
            if (invoice && state.invoiceNumber === invoice.invoiceNumber) return true;
        }
        return !state.invoiceNumber;
    });

    // Items currently linked to the invoice being edited
    const linkedItems = editingId
        ? allBillingItems.filter(item => {
            const state = data.billingState[item.id] || {};
            const invoice = data.invoices.find(inv => inv.id === editingId);
            return invoice && state.invoiceNumber === invoice.invoiceNumber;
        })
        : [];

    const handleSave = () => {
        if (!formData.invoiceNumber) {
            alert('Invoice Number is required');
            return;
        }

        if (editingId) {
            // Update existing invoice
            updateInvoice(editingId, formData);

            // Auto-update status of linked items
            const invoice = data.invoices.find(inv => inv.id === editingId);
            if (invoice) {
                // Find all items currently linked to this invoice (using the OLD invoice number if it changed, or just current state)
                // Actually, we should use the items we know are linked.
                // But if invoice number changed, we need to be careful.
                // Let's assume invoice number doesn't change often, or if it does, we update items.

                // We need to update ALL items that are currently linked to this invoice to the new status/number
                // We can find them by the invoice ID if we stored it, but we store invoiceNumber.
                // So we find items with the *original* invoice number.
                const originalInvoiceNumber = invoice.invoiceNumber;
                const linkedItemIds = allBillingItems
                    .filter(item => (data.billingState[item.id] || {}).invoiceNumber === originalInvoiceNumber)
                    .map(item => item.id);

                // Also include any newly selected items if we allowed adding in edit mode (which we do now)
                const newlySelectedIds = Array.from(selectedBillingItems);
                const allIdsToUpdate = [...new Set([...linkedItemIds, ...newlySelectedIds])];

                if (allIdsToUpdate.length > 0) {
                    bulkUpdateBillingItems(allIdsToUpdate, {
                        status: formData.status === 'Paid' ? 'Paid' : 'Invoiced',
                        invoiceNumber: formData.invoiceNumber // Update in case it changed
                    });
                }
            }

        } else {
            // Create new invoice
            const newInvoice = {
                id: generateId(),
                ...formData,
                amount: Array.from(selectedBillingItems).reduce((sum, id) => {
                    const item = allBillingItems.find(i => i.id === id);
                    return sum + (item ? item.amount : 0);
                }, 0)
            };
            addInvoice(newInvoice);

            // Update selected billing items
            if (selectedBillingItems.size > 0) {
                bulkUpdateBillingItems(Array.from(selectedBillingItems), {
                    invoiceNumber: formData.invoiceNumber,
                    status: 'Invoiced'
                });
            }
        }

        setIsAdding(false);
        setEditingId(null);
        setFormData({
            invoiceNumber: '',
            dateInvoiced: format(new Date(), 'yyyy-MM-dd'),
            datePaid: '',
            status: 'Pending',
            notes: '',
            attachments: []
        });
        setSelectedBillingItems(new Set());
    };

    const startEdit = (invoice) => {
        setEditingId(invoice.id);
        setFormData({
            invoiceNumber: invoice.invoiceNumber,
            dateInvoiced: invoice.dateInvoiced,
            datePaid: invoice.datePaid || '',
            status: invoice.status,
            notes: invoice.notes || '',
            attachments: invoice.attachments || []
        });
        setSelectedBillingItems(new Set()); // Clear selection, we'll show linked items separately
        setIsAdding(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this invoice? This will NOT remove the billing items, but will unlink them.')) {
            const invoice = data.invoices.find(inv => inv.id === id);
            if (invoice) {
                // Unlink items
                const linkedItemIds = allBillingItems
                    .filter(item => (data.billingState[item.id] || {}).invoiceNumber === invoice.invoiceNumber)
                    .map(item => item.id);

                if (linkedItemIds.length > 0) {
                    bulkUpdateBillingItems(linkedItemIds, {
                        invoiceNumber: '',
                        status: 'Pending'
                    });
                }
            }
            deleteInvoice(id);
        }
    };

    const toggleItemSelect = (id) => {
        const newSet = new Set(selectedBillingItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedBillingItems(newSet);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newAttachments = files.map(file => ({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            date: format(new Date(), 'yyyy-MM-dd HH:mm'),
            type: file.type
        }));
        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const unlinkItem = (itemId) => {
        if (window.confirm('Unlink this item from the invoice?')) {
            bulkUpdateBillingItems([itemId], {
                invoiceNumber: '',
                status: 'Pending'
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Invoices</h2>
                    <p className="text-slate-400">Manage and track invoices.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    New Invoice
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-100">
                                {editingId ? 'Edit Invoice' : 'New Invoice'}
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-200">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Invoice Details */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Details</h4>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Invoice Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.invoiceNumber}
                                            onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Status</label>
                                        <select
                                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Date Invoiced</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.dateInvoiced}
                                                onChange={e => setFormData({ ...formData, dateInvoiced: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Date Paid</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.datePaid}
                                                onChange={e => setFormData({ ...formData, datePaid: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Notes</label>
                                        <textarea
                                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                        <h4 className="text-sm font-semibold text-slate-100">Attachments</h4>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                                        >
                                            <Upload className="h-3 w-3" />
                                            Upload
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            multiple
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {formData.attachments.length === 0 ? (
                                            <div className="text-sm text-slate-500 italic">No attachments.</div>
                                        ) : (
                                            formData.attachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg text-sm border border-slate-800">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                        <span className="truncate text-slate-200">{file.name}</span>
                                                        <span className="text-xs text-slate-500">({file.size})</span>
                                                    </div>
                                                    <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300 ml-2">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: CLIN Management */}
                            <div className="space-y-6">
                                {/* Currently Linked Items (Edit Mode Only) */}
                                {editingId && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Linked Items</h4>
                                        <div className="border border-slate-800 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-800 bg-slate-950">
                                            {linkedItems.length === 0 ? (
                                                <div className="p-4 text-center text-slate-500 text-sm">No items linked.</div>
                                            ) : (
                                                linkedItems.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-3">
                                                        <div className="flex-1 text-sm">
                                                            <div className="font-medium text-slate-200">{item.deploymentName}</div>
                                                            <div className="text-slate-500 text-xs">
                                                                {item.type} • ${item.amount.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => unlinkItem(item.id)}
                                                            className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded"
                                                            title="Unlink Item"
                                                        >
                                                            <MinusCircle className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Add New Items */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
                                        {editingId ? 'Add More Items' : 'Select Items'}
                                    </h4>
                                    <div className="border border-slate-800 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-800 bg-slate-950">
                                        {availableItems.filter(i => !linkedItems.find(l => l.id === i.id)).length === 0 ? (
                                            <div className="p-4 text-center text-slate-500 text-sm">No available items.</div>
                                        ) : (
                                            availableItems
                                                .filter(i => !linkedItems.find(l => l.id === i.id))
                                                .map(item => (
                                                    <div key={item.id} className="flex items-center p-3 hover:bg-slate-900">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 mr-3"
                                                            checked={selectedBillingItems.has(item.id)}
                                                            onChange={() => toggleItemSelect(item.id)}
                                                        />
                                                        <div className="flex-1 text-sm">
                                                            <div className="font-medium text-slate-200">{item.deploymentName}</div>
                                                            <div className="text-slate-500 text-xs">
                                                                {item.type} • {format(parseISO(item.startDate), 'MMM d')} - {format(parseISO(item.endDate), 'MMM d')}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-200">
                                                            ${item.amount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                    <div className="text-right text-sm font-medium text-slate-200 mt-2">
                                        Selected Total: ${Array.from(selectedBillingItems).reduce((sum, id) => {
                                            const item = allBillingItems.find(i => i.id === id);
                                            return sum + (item ? item.amount : 0);
                                        }, 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                            >
                                {editingId ? 'Update Invoice' : 'Create Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-3">Invoice #</th>
                            <th className="px-6 py-3">Date Invoiced</th>
                            <th className="px-6 py-3">Date Paid</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        {invoice.invoiceNumber}
                                        {invoice.attachments && invoice.attachments.length > 0 && (
                                            <Paperclip className="h-3 w-3 text-slate-500" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {invoice.dateInvoiced ? format(parseISO(invoice.dateInvoiced), 'MMM d, yyyy') : '-'}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {invoice.datePaid ? format(parseISO(invoice.datePaid), 'MMM d, yyyy') : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit",
                                        invoice.status === 'Paid' ? "bg-green-900/30 text-green-400" :
                                            invoice.status === 'Cancelled' ? "bg-red-900/30 text-red-400" :
                                                "bg-yellow-900/30 text-yellow-400"
                                    )}>
                                        {invoice.status === 'Paid' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-200">
                                    ${invoice.amount ? invoice.amount.toLocaleString() : '0'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => startEdit(invoice)} className="text-blue-400 hover:text-blue-300">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(invoice.id)} className="text-red-400 hover:text-red-300">
                                            <Trash className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.invoices.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    No invoices found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
