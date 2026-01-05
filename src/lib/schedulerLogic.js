import { addDays, parseISO, max, format, differenceInDays } from 'date-fns';

export function autoSchedule(items, dependencies) {
    if (!items.length) return items;

    // 1. Build Graph
    const graph = {}; // adj list
    const revGraph = {};
    const itemMap = {};

    items.forEach(i => {
        graph[i.id] = [];
        revGraph[i.id] = [];
        itemMap[i.id] = { ...i, duration: differenceInDays(parseISO(i.endAt), parseISO(i.startAt)) + 1 };
    });

    dependencies.forEach(d => {
        if (graph[d.predecessorId] && graph[d.successorId]) {
            graph[d.predecessorId].push({ target: d.successorId, type: d.type, lag: d.lagMinutes });
            revGraph[d.successorId].push({ source: d.predecessorId, type: d.type, lag: d.lagMinutes });
        }
    });

    // 2. Topological Sort (Kahn's Algo)
    const inDegree = {};
    items.forEach(i => inDegree[i.id] = 0);
    dependencies.forEach(d => {
        if (inDegree[d.successorId] !== undefined) inDegree[d.successorId]++;
    });

    const queue = items.filter(i => inDegree[i.id] === 0).map(i => i.id);
    const order = [];

    while (queue.length) {
        const u = queue.shift();
        order.push(u);

        if (graph[u]) {
            graph[u].forEach(edge => {
                inDegree[edge.target]--;
                if (inDegree[edge.target] === 0) queue.push(edge.target);
            });
        }
    }

    if (order.length !== items.length) {
        console.warn("Cycle detected in dependencies. Auto-schedule aborted.");
        return items; // Cycle detected
    }

    // 3. Forward Pass (ES, EF)
    // Initialize starts to original start or today? For now, preserve start of roots.
    const schedule = {};

    order.forEach(id => {
        const item = itemMap[id];
        let earlyStart = parseISO(item.startAt);

        // Max(Predecessor EF + Lag)
        if (revGraph[id]) {
            revGraph[id].forEach(edge => {
                const pred = schedule[edge.source];
                if (pred) {
                    // Logic for types. Assuming FS only for V1 simplicity + Lag
                    // FS: Start = Pred End + Lag
                    // Lag is in minutes, convert to days? Assuming 0 for now or simple day mapping.
                    // Let's assume lag is days for this logic or 0.

                    const predEnd = parseISO(pred.endAt);
                    const potentialStart = addDays(predEnd, 1); // Next day
                    if (potentialStart > earlyStart) earlyStart = potentialStart;
                }
            });
        }

        const earlyEnd = addDays(earlyStart, Math.max(0, item.duration - 1));
        schedule[id] = {
            ...item,
            startAt: format(earlyStart, 'yyyy-MM-dd'),
            endAt: format(earlyEnd, 'yyyy-MM-dd')
        };
    });

    // 4. Backward Pass (LS, LF) - Optional for critical path highlighting
    // For now, just return new dates.

    return items.map(i => schedule[i.id] || i);
}
