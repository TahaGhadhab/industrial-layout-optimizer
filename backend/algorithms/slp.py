"""
SLP (Systematic Layout Planning) — Richard Muther's Method
Full 6-step implementation:
  1. Flow Analysis → FROM-TO matrix
  2. REL Chart Construction → AEIOUX codes
  3. Activity Relationship Diagram → scores + director machine
  4. Space Requirements
  5. Initial Layout Placement (greedy 2D grid)
  6. Layout Optimization (pairwise swaps)
"""

import math
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# REL CODE MAPPING
# ─────────────────────────────────────────────────────────────────────────────

REL_NUMERIC = {"A": 4, "E": 3, "I": 2, "O": 1, "U": 0, "X": -1}
REL_ORDER = ["A", "E", "I", "O", "U", "X"]


def numeric_to_code(value: int) -> str:
    if value >= 4:
        return "A"
    if value == 3:
        return "E"
    if value == 2:
        return "I"
    if value == 1:
        return "O"
    if value == 0:
        return "U"
    return "X"


def ratio_to_code(ratio: float) -> str:
    if ratio >= 0.80:
        return "A"
    if ratio >= 0.60:
        return "E"
    if ratio >= 0.40:
        return "I"
    if ratio >= 0.20:
        return "O"
    return "U"


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — FLOW ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

def build_from_to_matrix(
    routings: dict[str, list[str]],
    volumes: Optional[dict[str, float]],
    machines: list[str],
) -> dict[str, dict[str, float]]:
    """
    Build bidirectional FROM-TO matrix from routing sequences and volumes.
    Returns: from_to[Mi][Mj] = total flow passing between Mi and Mj (bidirectional).
    """
    m_idx = {m: i for i, m in enumerate(machines)}
    n = len(machines)
    matrix = [[0.0] * n for _ in range(n)]

    for part, route in routings.items():
        vol = float((volumes or {}).get(part, 1))
        for step in range(len(route) - 1):
            src = route[step]
            dst = route[step + 1]
            if src in m_idx and dst in m_idx:
                i, j = m_idx[src], m_idx[dst]
                matrix[i][j] += vol

    # Build symmetric bidirectional dict
    from_to: dict[str, dict[str, float]] = {}
    for mi in machines:
        from_to[mi] = {}
        for mj in machines:
            if mi != mj:
                i, j = m_idx[mi], m_idx[mj]
                from_to[mi][mj] = matrix[i][j] + matrix[j][i]

    return from_to


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — REL CHART CONSTRUCTION
# ─────────────────────────────────────────────────────────────────────────────

def build_rel_chart(
    from_to: dict[str, dict[str, float]],
    qualitative_rel: Optional[list[dict]] = None,
) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, int]]]:
    """
    Convert FROM-TO flows → AEIOUX REL codes, merge with qualitative input.
    Returns (rel_chart, rel_numeric) where keys are sorted machine pairs.
    """
    machines = list(from_to.keys())
    qual_map: dict[tuple[str, str], dict] = {}

    if qualitative_rel:
        for entry in qualitative_rel:
            a = entry.get("from", "")
            b = entry.get("to", "")
            key = (min(a, b), max(a, b))
            code = str(entry.get("code", "U")).upper()
            if code not in REL_NUMERIC:
                code = "U"
            # Keep the one with higher absolute numeric value
            existing = qual_map.get(key)
            if existing is None or abs(REL_NUMERIC[code]) > abs(REL_NUMERIC[existing["code"]]):
                qual_map[key] = {"code": code, "reason": entry.get("reason", "")}

    # Find max flow for normalization
    all_flows = [
        from_to[mi][mj]
        for mi in machines
        for mj in machines
        if mi != mj and from_to[mi].get(mj, 0) > 0
    ]
    max_flow = max(all_flows) if all_flows else 1.0

    rel_chart: dict[str, dict[str, str]] = {}
    rel_numeric: dict[str, dict[str, int]] = {}
    rel_reasons: dict[str, dict[str, str]] = {}

    for mi in machines:
        rel_chart[mi] = {}
        rel_numeric[mi] = {}
        rel_reasons[mi] = {}

    for i_idx, mi in enumerate(machines):
        for mj in machines[i_idx + 1 :]:
            flow = from_to[mi].get(mj, 0.0)
            ratio = flow / max_flow if max_flow > 0 else 0.0
            flow_code = ratio_to_code(ratio)
            flow_numeric = REL_NUMERIC[flow_code]

            key = (min(mi, mj), max(mi, mj))
            qual = qual_map.get(key)
            reason = ""

            if qual:
                qcode = qual["code"]
                qnum = REL_NUMERIC[qcode]
                # X always wins; otherwise take higher absolute value (X=-1 is special)
                if qcode == "X":
                    final_code = "X"
                    reason = qual["reason"]
                elif flow_numeric >= qnum:
                    final_code = flow_code
                    reason = "flow"
                else:
                    final_code = qcode
                    reason = qual["reason"]
            else:
                final_code = flow_code
                reason = "flow" if flow > 0 else ""

            final_numeric = REL_NUMERIC[final_code]

            rel_chart[mi][mj] = final_code
            rel_chart[mj][mi] = final_code
            rel_numeric[mi][mj] = final_numeric
            rel_numeric[mj][mi] = final_numeric
            rel_reasons[mi][mj] = reason
            rel_reasons[mj][mi] = reason

    return rel_chart, rel_numeric, rel_reasons


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — ACTIVITY RELATIONSHIP SCORES
# ─────────────────────────────────────────────────────────────────────────────

def compute_scores(
    rel_numeric: dict[str, dict[str, int]],
    machines: list[str],
) -> tuple[dict[str, int], str]:
    """
    Compute total REL score per machine, identify director machine.
    The score is the sum of absolute numeric values (X counted as -1).
    """
    scores: dict[str, int] = {}
    for mi in machines:
        scores[mi] = sum(rel_numeric[mi].get(mj, 0) for mj in machines if mj != mi)

    director = max(machines, key=lambda m: scores[m])
    return scores, director


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — SPACE REQUIREMENTS
# ─────────────────────────────────────────────────────────────────────────────

def compute_space_requirements(
    spaces: Optional[dict[str, float]],
    available_space: Optional[float],
    machines: list[str],
) -> tuple[dict[str, float], float]:
    """
    Compute space requirements per machine.
    Returns (space_requirements, space_ratio).
    """
    if not spaces:
        space_req = {m: 1.0 for m in machines}
    else:
        space_req = {m: float(spaces.get(m, 1.0)) for m in machines}

    total_req = sum(space_req.values())

    if available_space and available_space > 0 and total_req > available_space:
        scale = available_space / total_req
        space_req = {m: v * scale for m, v in space_req.items()}
        total_req = available_space

    space_ratio = total_req / available_space if available_space and available_space > 0 else 1.0

    return space_req, round(space_ratio, 4)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — INITIAL LAYOUT PLACEMENT
# ─────────────────────────────────────────────────────────────────────────────

def _euclidean(p1: tuple[int, int], p2: tuple[int, int]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def _adjacent_free_positions(
    placed_positions: set[tuple[int, int]],
    occupied: set[tuple[int, int]],
) -> list[tuple[int, int]]:
    """All grid positions adjacent (orthogonally) to placed machines and not occupied."""
    candidates = set()
    for px, py in placed_positions:
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            pos = (px + dx, py + dy)
            if pos not in occupied:
                candidates.add(pos)
    return list(candidates)


def build_initial_layout(
    rel_numeric: dict[str, dict[str, int]],
    director: str,
    machines: list[str],
) -> dict[str, dict[str, int]]:
    """
    Greedy 2D grid placement:
    1. Place director at (0, 0)
    2. Iteratively pick highest-scored remaining machine
    3. Place it at the free adjacent position minimizing total weighted distance
    """
    positions: dict[str, tuple[int, int]] = {}
    placed: list[str] = []
    remaining = list(machines)

    # Place director at center
    positions[director] = (0, 0)
    placed.append(director)
    remaining.remove(director)

    while remaining:
        # Score each remaining machine by its rel_numeric sum with placed
        best_machine = None
        best_score = -float("inf")

        for m in remaining:
            score = sum(rel_numeric[m].get(p, 0) for p in placed)
            if score > best_score:
                best_score = score
                best_machine = m

        if best_machine is None:
            best_machine = remaining[0]

        # Find all free positions adjacent to the currently placed block
        placed_pos_set = set(positions[p] for p in placed)
        candidates = _adjacent_free_positions(placed_pos_set, placed_pos_set)

        if not candidates:
            # Fallback: extend in a line
            last = positions[placed[-1]]
            candidates = [(last[0] + 1, last[1])]

        # Pick candidate that minimizes total placement cost
        best_pos = None
        best_pos_cost = float("inf")

        for pos in candidates:
            cost = 0.0
            for p in placed:
                rel_val = abs(rel_numeric[best_machine].get(p, 0))
                dist = _euclidean(pos, positions[p])
                if dist == 0:
                    dist = 0.1
                # X relations: we WANT distance; positive rel: we WANT closeness
                raw = rel_numeric[best_machine].get(p, 0)
                if raw >= 0:
                    cost += rel_val * dist  # minimize
                else:
                    cost -= rel_val * dist  # X: prefer farther → negate to minimize

            if cost < best_pos_cost:
                best_pos_cost = cost
                best_pos = pos

        positions[best_machine] = best_pos  # type: ignore
        placed.append(best_machine)
        remaining.remove(best_machine)

    layout = {m: {"x": positions[m][0], "y": positions[m][1]} for m in machines}
    return layout


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — LAYOUT OPTIMIZATION (SWAP)
# ─────────────────────────────────────────────────────────────────────────────

def _total_layout_cost(
    positions: dict[str, tuple[int, int]],
    rel_numeric: dict[str, dict[str, int]],
    machines: list[str],
) -> float:
    """
    total_cost = sum over all pairs (i<j):
      abs(rel_numeric[i][j]) * distance(i, j)
    X relations penalize proximity → add cost when close.
    """
    cost = 0.0
    for idx_i, mi in enumerate(machines):
        for mj in machines[idx_i + 1 :]:
            raw = rel_numeric[mi].get(mj, 0)
            dist = _euclidean(positions[mi], positions[mj])
            if dist == 0:
                dist = 0.1
            if raw >= 0:
                cost += raw * dist
            else:
                # X: we want distance, so cost = 1/dist (penalty for closeness)
                cost += abs(raw) * (1.0 / dist)
    return cost


def optimize_layout_slp(
    initial_layout: dict[str, dict[str, int]],
    rel_numeric: dict[str, dict[str, int]],
    machines: list[str],
) -> tuple[dict[str, dict[str, int]], float, float, list[dict]]:
    """
    Pairwise swap optimization. Returns:
    (optimized_layout, initial_cost, final_cost, optimization_steps)
    """
    positions: dict[str, tuple[int, int]] = {
        m: (d["x"], d["y"]) for m, d in initial_layout.items()
    }

    initial_cost = _total_layout_cost(positions, rel_numeric, machines)
    current_cost = initial_cost
    steps = []
    step_num = 0
    improved = True

    while improved:
        improved = False
        for idx_i, mi in enumerate(machines):
            for mj in machines[idx_i + 1 :]:
                # Swap
                positions[mi], positions[mj] = positions[mj], positions[mi]
                new_cost = _total_layout_cost(positions, rel_numeric, machines)

                if new_cost < current_cost - 1e-9:
                    step_num += 1
                    steps.append({
                        "step": step_num,
                        "swap": [mi, mj],
                        "cost_before": round(current_cost, 4),
                        "cost_after": round(new_cost, 4),
                    })
                    current_cost = new_cost
                    improved = True
                else:
                    # Undo
                    positions[mi], positions[mj] = positions[mj], positions[mi]

    final_layout = {m: {"x": positions[m][0], "y": positions[m][1]} for m in machines}
    return final_layout, round(initial_cost, 4), round(current_cost, 4), steps


# ─────────────────────────────────────────────────────────────────────────────
# METRICS
# ─────────────────────────────────────────────────────────────────────────────

def compute_metrics(
    layout: dict[str, dict[str, int]],
    rel_numeric: dict[str, dict[str, int]],
    rel_chart: dict[str, dict[str, str]],
    initial_cost: float,
    final_cost: float,
    machines: list[str],
) -> dict:
    positions = {m: (d["x"], d["y"]) for m, d in layout.items()}

    A_satisfied = 0
    X_violated = 0
    A_total = 0
    X_total = 0
    adj_score = 0.0

    for idx_i, mi in enumerate(machines):
        for mj in machines[idx_i + 1 :]:
            code = rel_chart[mi].get(mj, "U")
            num = rel_numeric[mi].get(mj, 0)
            dist = _euclidean(positions[mi], positions[mj])
            if dist == 0:
                dist = 0.1

            if code == "A":
                A_total += 1
                if dist <= 1.5:
                    A_satisfied += 1
            elif code == "X":
                X_total += 1
                if dist <= 1.5:
                    X_violated += 1

            if code != "U":
                adj_score += num / dist

    sig_pairs = A_total + X_total
    Ro = (A_satisfied + (X_total - X_violated)) / sig_pairs if sig_pairs > 0 else 1.0

    improvement_pct = (
        round((initial_cost - final_cost) / initial_cost * 100, 2)
        if initial_cost > 0
        else 0.0
    )

    return {
        "total_cost_initial": initial_cost,
        "total_cost_optimized": final_cost,
        "improvement_percent": improvement_pct,
        "optimality_ratio": round(max(0.0, min(1.0, Ro)), 4),
        "A_relations_satisfied": A_satisfied,
        "X_relations_violated": X_violated,
        "adjacency_score": round(adj_score, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def run_slp(
    routings: dict[str, list[str]],
    volumes: Optional[dict[str, float]],
    qualitative_rel: Optional[list[dict]],
    spaces: Optional[dict[str, float]],
    available_space: Optional[float],
) -> dict:
    """
    Run all 6 SLP steps and return the full result payload.
    """
    # Extract all machine names from routings (preserve insertion order)
    seen = {}
    for route in routings.values():
        for m in route:
            seen[m] = True
    machines = list(seen.keys())

    if len(machines) == 0:
        raise ValueError("No machines found in routing sequences.")

    # Edge case: single machine
    if len(machines) == 1:
        m = machines[0]
        return {
            "machines": machines,
            "from_to_matrix": {m: {}},
            "rel_chart": {m: {}},
            "rel_numeric": {m: {}},
            "rel_reasons": {m: {}},
            "scores": {m: 0},
            "director_machine": m,
            "layout": {m: {"x": 0, "y": 0}},
            "initial_layout": {m: {"x": 0, "y": 0}},
            "space_requirements": {m: 1.0},
            "space_ratio": 1.0,
            "metrics": {
                "total_cost_initial": 0.0,
                "total_cost_optimized": 0.0,
                "improvement_percent": 0.0,
                "optimality_ratio": 1.0,
                "A_relations_satisfied": 0,
                "X_relations_violated": 0,
                "adjacency_score": 0.0,
            },
            "optimization_steps": [],
        }

    # Step 1
    from_to = build_from_to_matrix(routings, volumes, machines)

    # Step 2
    rel_chart, rel_numeric, rel_reasons = build_rel_chart(from_to, qualitative_rel)

    # Step 3
    scores, director = compute_scores(rel_numeric, machines)

    # Step 4
    space_req, space_ratio = compute_space_requirements(spaces, available_space, machines)

    # Step 5
    initial_layout = build_initial_layout(rel_numeric, director, machines)

    # Step 6
    final_layout, initial_cost, final_cost, opt_steps = optimize_layout_slp(
        initial_layout, rel_numeric, machines
    )

    # Metrics
    metrics = compute_metrics(
        final_layout, rel_numeric, rel_chart, initial_cost, final_cost, machines
    )

    # Serialize from_to for response (only non-zero)
    from_to_serialized = {
        mi: {mj: v for mj, v in row.items() if v > 0}
        for mi, row in from_to.items()
    }

    return {
        "machines": machines,
        "from_to_matrix": from_to_serialized,
        "rel_chart": {mi: dict(row) for mi, row in rel_chart.items()},
        "rel_numeric": {mi: dict(row) for mi, row in rel_numeric.items()},
        "rel_reasons": {mi: dict(row) for mi, row in rel_reasons.items()},
        "scores": scores,
        "director_machine": director,
        "layout": final_layout,
        "initial_layout": initial_layout,
        "space_requirements": {m: round(v, 2) for m, v in space_req.items()},
        "space_ratio": space_ratio,
        "metrics": metrics,
        "optimization_steps": opt_steps,
    }
