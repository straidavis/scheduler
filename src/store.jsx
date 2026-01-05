import { useState, useEffect, createContext, useContext } from 'react';

const StoreContext = createContext();

const INITIAL_DATA = {
    deployments: [],
    laborCategories: [
        { id: 'lc_1', name: 'Project Manager', isOvertimeEligible: false, baseRate: 150 },
        { id: 'lc_2', name: 'Senior Engineer', isOvertimeEligible: true, baseRate: 120 },
        { id: 'lc_3', name: 'Junior Engineer', isOvertimeEligible: true, baseRate: 80 },
    ],
    laborEntries: [],
    fiscalYearRates: [
        { year: 2025, periodRates: {} }
    ],
    invoices: [],
    overhead: [], // { id, categoryId, month, hours }
    billingState: {}, // Map of billingItemId -> { status, invoiceNumber }
    pricing: {
        "1": { land15: 0, landOA: 0, ship15: 0, ship1: 0 },
        "2": { land15: 0, landOA: 0, ship15: 0, ship1: 0 },
        "3": { land15: 0, landOA: 0, ship15: 0, ship1: 0 },
        "4": { land15: 0, landOA: 0, ship15: 0, ship1: 0 },
        "5": { land15: 0, landOA: 0, ship15: 0, ship1: 0 },
    }
};

export function StoreProvider({ children }) {
    const [data, setData] = useState(INITIAL_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/data');
                if (response.ok) {
                    const jsonData = await response.json();
                    setData({ ...INITIAL_DATA, ...jsonData });
                } else {
                    console.error("Failed to fetch data");
                }
            } catch (error) {
                console.error("Error connecting to backend:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        fetchData();
    }, []);

    // Sync to backend on change
    useEffect(() => {
        if (!isLoaded) return;

        const saveData = async () => {
            try {
                await fetch('http://localhost:8000/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } catch (error) {
                console.error("Failed to save data:", error);
            }
        };

        const timeoutId = setTimeout(saveData, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [data, isLoaded]);

    // Deployments
    const addDeployment = (deployment) => {
        setData(prev => ({ ...prev, deployments: [...prev.deployments, deployment] }));
    };

    const updateDeployment = (id, updates) => {
        setData(prev => ({
            ...prev,
            deployments: prev.deployments.map(d => d.id === id ? { ...d, ...updates } : d),
            // Shift labor entries only if dates are provided in updates
            laborEntries: ('startDate' in updates || 'endDate' in updates) ? prev.laborEntries.map(entry =>
                entry.deploymentId === id ? {
                    ...entry,
                    startDate: updates.startDate !== undefined ? updates.startDate : entry.startDate,
                    endDate: updates.endDate !== undefined ? updates.endDate : entry.endDate
                } : entry
            ) : prev.laborEntries
        }));
    };

    const deleteDeployment = (id) => {
        setData(prev => ({
            ...prev,
            deployments: prev.deployments.filter(d => d.id !== id),
            laborEntries: prev.laborEntries.filter(entry => entry.deploymentId !== id)
        }));
    };

    // Labor Categories
    const addLaborCategory = (category) => {
        setData(prev => ({ ...prev, laborCategories: [...prev.laborCategories, category] }));
    };

    const updateLaborCategory = (id, updates) => {
        setData(prev => ({
            ...prev,
            laborCategories: prev.laborCategories.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    };

    const deleteLaborCategory = (id) => {
        setData(prev => ({
            ...prev,
            laborCategories: prev.laborCategories.filter(c => c.id !== id)
        }));
    };

    // Labor Entries
    const addLaborEntry = (entry) => {
        setData(prev => ({ ...prev, laborEntries: [...prev.laborEntries, entry] }));
    };

    // Invoices
    const addInvoice = (invoice) => {
        setData(prev => ({
            ...prev,
            invoices: [...prev.invoices, invoice]
        }));
    };

    const updateInvoice = (id, updates) => {
        setData(prev => ({
            ...prev,
            invoices: prev.invoices.map(inv =>
                inv.id === id ? { ...inv, ...updates } : inv
            )
        }));
    };

    const deleteInvoice = (id) => {
        setData(prev => ({
            ...prev,
            invoices: prev.invoices.filter(inv => inv.id !== id)
        }));
    };

    // Billing Items State
    const updateBillingItem = (id, updates) => {
        setData(prev => ({
            ...prev,
            billingState: {
                ...prev.billingState,
                [id]: { ...(prev.billingState[id] || {}), ...updates }
            }
        }));
    };

    const bulkUpdateBillingItems = (ids, updates) => {
        setData(prev => {
            const newState = { ...prev.billingState };
            ids.forEach(id => {
                newState[id] = { ...(newState[id] || {}), ...updates };
            });
            return { ...prev, billingState: newState };
        });
    };

    const setOverhead = (newOverhead) => {
        setData(prev => ({ ...prev, overhead: newOverhead }));
    };

    const updatePricing = (period, values) => {
        setData(prev => ({
            ...prev,
            pricing: {
                ...prev.pricing,
                [period]: { ...prev.pricing[period], ...values }
            }
        }));
    };

    return (
        <StoreContext.Provider value={{
            data,
            addDeployment,
            updateDeployment,
            addLaborCategory,
            updateLaborCategory,
            deleteLaborCategory,
            addLaborEntry,
            addInvoice,
            updateInvoice,

            deleteInvoice,
            updateBillingItem,
            bulkUpdateBillingItems,
            deleteDeployment,
            setOverhead,
            updatePricing
        }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    return useContext(StoreContext);
}
