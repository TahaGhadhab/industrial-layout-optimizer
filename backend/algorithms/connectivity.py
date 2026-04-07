"""Connectivity-Based Chaining Method.

This module implements the simplified chaining method based on connectivity
(number of links) rather than flow volumes. It builds a structure matrix,
computes connectivity per machine, selects a director, builds the layout,
detects off-tram links and crossings, and optimizes.
"""
import numpy as np
import math


def build_structure_matrix(routings: list[list[int]] | None,
                           n_machines: int) -> list[list[int]]:
    """Build a symmetric binary structure matrix from routings.
    
    For each consecutive pair (i → j) in a routing, set S[i][j] = S[j][i] = 1.
    Ignores volumes entirely.
    """
    S = [[0] * n_machines for _ in range(n_machines)]
    if not routings:
        return S

    for sequence in routings:
        if not sequence or len(sequence) < 2:
            continue
        for step in range(len(sequence) - 1):
            from_m = sequence[step]
            to_m = sequence[step + 1]
            if from_m != to_m and 0 <= from_m < n_machines and 0 <= to_m < n_machines:
                S[from_m][to_m] = 1
                S[to_m][from_m] = 1  # symmetric / undirected

    return S


def compute_connectivity(S: list[list[int]]) -> list[int]:
    """Compute connectivity for each machine: number of distinct links."""
    n = len(S)
    connectivity = [0] * n
    for i in range(n):
        for j in range(n):
            connectivity[i] += S[i][j]
    return connectivity


def select_director(connectivity: list[int]) -> int:
    """Select the director machine (the one with max connectivity)."""
    if not connectivity:
        return 0
    return int(np.argmax(connectivity))


def triangular_structure_matrix(S: list[list[int]]) -> list[list[int | None]]:
    """Create upper-triangular view of the structure matrix."""
    n = len(S)
    triangular = []
    for i in range(n):
        row = []
        for j in range(n):
            if j > i:
                row.append(S[i][j])
            else:
                row.append(None)
        triangular.append(row)
    return triangular


def build_layout_connectivity(S: list[list[int]], connectivity: list[int],
                               machine_labels: list[str]):
    """Greedy layout generation placing the director at center.
    
    Same algorithm as flow-based but uses binary structure matrix
    for strength rather than flow volumes.
    """
    n = len(S)
    if n == 0:
        return []

    director = select_director(connectivity)
    placed = {director: (0, 0)}
    unplaced = set(range(n)) - {director}

    def get_free_neighbors(x, y):
        radius = 1
        while True:
            candidates = []
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    if dx == 0 and dy == 0:
                        continue
                    candidates.append((x + dx, y + dy))
            free = [c for c in candidates if c not in placed.values()]
            if free:
                return free
            radius += 1

    # Greedily place machines by connection strength to already-placed machines
    while unplaced:
        best_candidate = None
        best_score = -1

        for m in unplaced:
            # Score = number of connections to placed machines
            score = sum(S[m][p] for p in placed)
            if score > best_score:
                best_score = score
                best_candidate = m

        if best_candidate is None:
            best_candidate = list(unplaced)[0]

        # Find best position minimizing distance to connected placed nodes
        best_pos = None
        best_pos_cost = float('inf')

        candidates = set()
        for p_m, (px, py) in placed.items():
            for c in get_free_neighbors(px, py):
                candidates.add(c)

        for cx, cy in candidates:
            cost = 0
            for p_m, (px, py) in placed.items():
                s = S[best_candidate][p_m]
                dist = math.hypot(cx - px, cy - py)
                cost += s * dist

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
    if A == C or A == D or B == C or B == D:
        return False
    return _ccw(A, C, D) != _ccw(B, C, D) and _ccw(A, B, C) != _ccw(A, B, D)


def detect_crossings_connectivity(layout: list[dict], S: list[list[int]],
                                   machine_labels: list[str]):
    """Detect crossings between active layout edges using the structure matrix."""
    n = len(layout)
    pos = {item["index"]: (item["x"], item["y"]) for item in layout}

    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            if S[i][j] > 0:
                edges.append((i, j))

    crossings_count = 0
    crossing_flows = []

    for idx_e1 in range(len(edges)):
        for idx_e2 in range(idx_e1 + 1, len(edges)):
            u1, v1 = edges[idx_e1]
            u2, v2 = edges[idx_e2]

            A, B = pos[u1], pos[v1]
            C, D = pos[u2], pos[v2]

            if _intersect(A, B, C, D):
                crossings_count += 1
                crossing_flows.append({
                    "edge1": [machine_labels[u1], machine_labels[v1]],
                    "edge2": [machine_labels[u2], machine_labels[v2]]
                })

    return crossings_count, crossing_flows


def detect_off_tram(layout: list[dict], S: list[list[int]],
                    machine_labels: list[str]):
    """Detect off-tram (long) links in the layout."""
    n = len(layout)
    pos = {item["index"]: (item["x"], item["y"]) for item in layout}

    links = []
    off_tram_links = []
    off_tram_count = 0

    for i in range(n):
        for j in range(i + 1, n):
            if S[i][j] > 0:
                dist_sq = (pos[i][0] - pos[j][0]) ** 2 + (pos[i][1] - pos[j][1]) ** 2
                dist = round(math.sqrt(dist_sq), 2)
                edge = {
                    "from": machine_labels[i],
                    "to": machine_labels[j],
                    "weight": 1,  # all links are equal weight in connectivity mode
                    "distance": dist
                }
                links.append(edge)
                if dist_sq > 2.5:
                    off_tram_links.append(edge)
                    off_tram_count += 1

    return links, off_tram_links, off_tram_count


def optimize_layout_connectivity(layout: list[dict], S: list[list[int]],
                                  machine_labels: list[str]):
    """Optimize layout by local swapping to minimize crossings and long links."""
    n = len(layout)
    if n <= 2:
        return layout, 0, 0, 1.0

    current_layout = [
        {"machine": l["machine"], "index": l["index"], "x": l["x"], "y": l["y"]}
        for l in layout
    ]

    def score(lyt):
        cross, _ = detect_crossings_connectivity(lyt, S, machine_labels)
        pos = {item["index"]: (item["x"], item["y"]) for item in lyt}
        long_links = 0
        total_links = 0
        for i in range(n):
            for j in range(i + 1, n):
                if S[i][j] > 0:
                    total_links += 1
                    dist = math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])
                    if dist > 1.5:
                        long_links += 1
        ro = 1.0 - (cross + long_links) / max(1, total_links)
        return ro, cross, long_links, total_links

    best_layout = current_layout
    best_ro, best_cross, best_long, total_links = score(best_layout)

    improved = True
    max_iters = 100
    iters = 0

    while improved and iters < max_iters:
        improved = False
        iters += 1

        for i in range(n):
            for j in range(i + 1, n):
                test_layout = [
                    {"machine": l["machine"], "index": l["index"], "x": l["x"], "y": l["y"]}
                    for l in best_layout
                ]
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
