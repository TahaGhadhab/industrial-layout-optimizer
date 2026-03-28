"""Physical Layout Optimization based on Flow.

This module replaces the old chaining method. It calculates flow matrices
based on part routings and volumes, selects a director machine, builds a
physical 2D layout, and detects edge crossings.
"""
import numpy as np
import math


def build_flow_matrix(routings: list[list[int]] | None,
                      volumes: list[int] | None,
                      n_machines: int) -> list[list[int]]:
    """Build a directed flow matrix from part routings and volumes.
    
    Args:
        routings: List of machine indices defining the sequence for each part.
        volumes: List of production volumes per part. Defaults to 1 if None.
        n_machines: Total number of machines.
    """
    flow = [[0] * n_machines for _ in range(n_machines)]
    if not routings:
        return flow
    
    vols = volumes if volumes else [1] * len(routings)
    for i in range(len(vols)):
        vols[i] = vols[i] if vols[i] is not None else 1

    for part_idx, sequence in enumerate(routings):
        if not sequence or len(sequence) < 2:
            continue
        v = vols[part_idx] if part_idx < len(vols) else 1
        for step in range(len(sequence) - 1):
            from_m = sequence[step]
            to_m = sequence[step + 1]
            if from_m != to_m and 0 <= from_m < n_machines and 0 <= to_m < n_machines:
                flow[from_m][to_m] += v
    
    return flow


def compute_traffic(flow: list[list[int]]) -> list[int]:
    """Calculate total traffic (in + out) for each machine."""
    n = len(flow)
    traffic = [0] * n
    for i in range(n):
        for j in range(n):
            traffic[i] += flow[i][j] + flow[j][i]
    return traffic


def select_director(traffic: list[int]) -> int:
    """Select the director machine (the one with max traffic)."""
    if not traffic:
        return 0
    return int(np.argmax(traffic))


def triangular_matrix(flow: list[list[int]]) -> list[list[int | None]]:
    """Create upper-triangular matrix of bidirectional flows."""
    n = len(flow)
    triangular = []
    for i in range(n):
        row = []
        for j in range(n):
            if j > i:
                row.append(flow[i][j] + flow[j][i])
            else:
                row.append(None)
        triangular.append(row)
    return triangular


def build_layout(flow: list[list[int]], traffic: list[int], machine_labels: list[str]):
    """Greedy layout generation placing the director at center."""
    n = len(flow)
    if n == 0:
        return []
    
    # Precompute bidirectional flow strengths
    strength = [[flow[i][j] + flow[j][i] for j in range(n)] for i in range(n)]
    
    director = select_director(traffic)
    placed = {director: (0, 0)}
    unplaced = set(range(n)) - {director}
    
    # Simple grid directions: right, down, left, up, and diagonals
    directions = [(1,0), (0,1), (-1,0), (0,-1), (1,1), (-1,1), (-1,-1), (1,-1)]
    
    def get_free_neighbors(x, y):
        # Generate candidates expanding outwards
        radius = 1
        while True:
            candidates = []
            for dx in range(-radius, radius+1):
                for dy in range(-radius, radius+1):
                    if dx == 0 and dy == 0:
                        continue
                    candidates.append((x + dx, y + dy))
            free = [c for c in candidates if c not in placed.values()]
            if free:
                return free
            radius += 1

    # Greedily place machines that have the highest connection to already placed ones
    while unplaced:
        best_candidate = None
        best_score = -1
        
        for m in unplaced:
            # Score is the sum of link strengths to placed machines
            score = sum(strength[m][p] for p in placed)
            if score > best_score:
                best_score = score
                best_candidate = m
                
        if best_candidate is None:
            # Fallback if graph is disconnected
            best_candidate = list(unplaced)[0]
            
        # Find best position for best_candidate
        # It should minimize distance to strongly connected placed nodes
        best_pos = None
        best_pos_cost = float('inf')
        
        # Consider free spots around all placed nodes
        candidates = set()
        for p_m, (px, py) in placed.items():
            for c in get_free_neighbors(px, py):
                candidates.add(c)
                
        for cx, cy in candidates:
            cost = 0
            for p_m, (px, py) in placed.items():
                s = strength[best_candidate][p_m]
                dist = math.hypot(cx - px, cy - py)
                cost += s * dist
                
            # Add small penalty for being far from center overall to keep it compact
            cost += 0.01 * math.hypot(cx, cy)
            
            if cost < best_pos_cost:
                best_pos_cost = cost
                best_pos = (cx, cy)
                
        if best_pos is None:
            best_pos = (0, len(placed))
            
        placed[best_candidate] = best_pos
        unplaced.remove(best_candidate)
        
    layout = []
    for i in range(n):
        x, y = placed.get(i, (0, 0))
        layout.append({
            "machine": machine_labels[i],
            "index": i,
            "x": x,
            "y": y
        })
        
    return layout


def _ccw(A, B, C):
    """Check if three points are listed in counterclockwise order."""
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def _intersect(A, B, C, D):
    """Return true if line segments AB and CD intersect."""
    # check colinearity or shared endpoints
    if A == C or A == D or B == C or B == D:
        return False
    return _ccw(A, C, D) != _ccw(B, C, D) and _ccw(A, B, C) != _ccw(A, B, D)


def detect_crossings(layout: list[dict], flow: list[list[int]], machine_labels: list[str]):
    """Detect crossings between active layout edges."""
    n = len(layout)
    pos = {item["index"]: (item["x"], item["y"]) for item in layout}
    
    edges = []
    for i in range(n):
        for j in range(i+1, n):
            total_flow = flow[i][j] + flow[j][i]
            if total_flow > 0:
                edges.append((i, j, total_flow))
                
    crossings_count = 0
    crossing_flows = []
    
    for idx_e1 in range(len(edges)):
        for idx_e2 in range(idx_e1 + 1, len(edges)):
            u1, v1, f1 = edges[idx_e1]
            u2, v2, f2 = edges[idx_e2]
            
            A, B = pos[u1], pos[v1]
            C, D = pos[u2], pos[v2]
            
            if _intersect(A, B, C, D):
                crossings_count += 1
                crossing_flows.append({
                    "edge1": [machine_labels[u1], machine_labels[v1]],
                    "edge2": [machine_labels[u2], machine_labels[v2]]
                })
                
    return crossings_count, crossing_flows


def optimize_layout(layout: list[dict], flow: list[list[int]], machine_labels: list[str]):
    """Optimize layout purely by local swapping to minimize crossings and long links."""
    n = len(layout)
    if n <= 2:
        return layout, 0, 0, 1.0
        
    current_layout = [{"machine": l["machine"], "index": l["index"], "x": l["x"], "y": l["y"]} for l in layout]
    
    def score(lyt):
        cross, _ = detect_crossings(lyt, flow, machine_labels)
        pos = {item["index"]: (item["x"], item["y"]) for item in lyt}
        long_links = 0
        total_links = 0
        for i in range(n):
            for j in range(i+1, n):
                if flow[i][j] + flow[j][i] > 0:
                    total_links += 1
                    dist = math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])
                    if dist > 1.5:  # Consider strictly adjacent grids as optimal
                        long_links += 1
        ro = 1.0 - (cross + long_links) / max(1, total_links)
        return ro, cross, long_links, total_links
        
    best_layout = current_layout
    best_ro, best_cross, best_long, total_links = score(best_layout)
    
    # Greedy steepest ascent swapping
    improved = True
    max_iters = 100
    iters = 0
    
    while improved and iters < max_iters:
        improved = False
        iters += 1
        
        for i in range(n):
            for j in range(i+1, n):
                # Try swap
                test_layout = [{"machine": l["machine"], "index": l["index"], "x": l["x"], "y": l["y"]} for l in best_layout]
                # Swap coordinates
                xi, yi = test_layout[i]["x"], test_layout[i]["y"]
                xj, yj = test_layout[j]["x"], test_layout[j]["y"]
                test_layout[i]["x"], test_layout[i]["y"] = xj, yj
                test_layout[j]["x"], test_layout[j]["y"] = xi, yi
                
                ro, cross, long_links, _ = score(test_layout)
                
                if ro > best_ro:
                    best_ro = ro
                    best_cross = cross
                    best_long = long_links
                    best_layout = test_layout
                    improved = True
                    
    return best_layout, best_cross, best_long, best_ro
