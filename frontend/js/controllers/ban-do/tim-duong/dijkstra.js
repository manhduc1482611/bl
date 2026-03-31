function findShortestPath(startId, endId, nodes, connections) {
    const graph = {};
    for (let id in nodes) graph[id] = {};

    const getPos = (node) => {
        if (!node) return null;
        const x = parseFloat(node.pos_x ?? node.x ?? node.X);
        const y = parseFloat(node.pos_y ?? node.y ?? node.Y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    };
    
    if (!Array.isArray(connections)) return [];

    connections.forEach(([p1, p2, type = 0]) => {
        if (nodes[p1] && nodes[p2]) {
            const p1pos = getPos(nodes[p1]);
            const p2pos = getPos(nodes[p2]);
            if (!p1pos || !p2pos) return;
            const d = Math.hypot(p1pos.x - p2pos.x, p1pos.y - p2pos.y);
            const edgeType = Number(type);
            if (edgeType === 0 || edgeType === 1) {
                graph[p1][p2] = Math.min(graph[p1][p2] || Infinity, d);
            }
            if (edgeType === 0 || edgeType === 2) {
                graph[p2][p1] = Math.min(graph[p2][p1] || Infinity, d);
            }
        }
    });

    let distances = {}, previous = {}, queue = [];
    for (let id in nodes) { distances[id] = Infinity; queue.push(id); }
    distances[startId] = 0;

    while (queue.length) {
        queue.sort((a, b) => distances[a] - distances[b]);
        let u = queue.shift();
        if (u === endId) break;
        
        for (let v in graph[u]) {
            let alt = distances[u] + graph[u][v];
            if (alt < distances[v]) { distances[v] = alt; previous[v] = u; }
        }
    }
    
    let path = [], curr = endId;
    if (previous[curr] || curr === startId) {
        while (curr) { path.unshift(curr); curr = previous[curr]; }
    }
    return path;
}