"""King's Method for matrix block-diagonalization.

Reorders rows and columns of a machine-part incidence matrix to reveal
block-diagonal structure by iteratively computing binary weights.
"""
import numpy as np
from copy import deepcopy


def king_method(matrix: list[list[int]],
                machine_labels: list[str],
                part_labels: list[str]) -> dict:
    """Run King's algorithm on a machine-part matrix.

    Args:
        matrix: n×m binary incidence matrix (machines × parts).
        machine_labels: Labels for machines (rows).
        part_labels: Labels for parts (columns).

    Returns:
        Dictionary with reordered matrix, row/col orders, steps, cells, etc.
    """
    A = np.array(matrix, dtype=int)
    n, m = A.shape
    row_order = list(range(n))
    col_order = list(range(m))
    steps = []
    iteration = 0

    while True:
        iteration += 1
        changed = False

        # Step 1: Compute column weights using current row order
        col_weights = []
        for j in range(m):
            w = 0
            for i in range(n):
                w += int(A[i, j]) * (2 ** (n - 1 - i))
            col_weights.append(w)

        # Step 2: Sort columns by descending weight
        new_col_order = sorted(range(m), key=lambda j: col_weights[j], reverse=True)
        if new_col_order != list(range(m)):
            changed = True
            A = A[:, new_col_order]
            col_order = [col_order[j] for j in new_col_order]

        steps.append({
            "iteration": iteration,
            "phase": "column_sort",
            "weights": {part_labels[col_order[j]]: col_weights[new_col_order[j]] if changed else col_weights[j]
                        for j in range(m)},
            "order": [part_labels[c] for c in col_order],
            "matrix": A.tolist(),
        })

        # Step 3: Compute row weights using current column order
        row_weights = []
        for i in range(n):
            w = 0
            for j in range(m):
                w += int(A[i, j]) * (2 ** (m - 1 - j))
            row_weights.append(w)

        # Step 4: Sort rows by descending weight
        new_row_order = sorted(range(n), key=lambda i: row_weights[i], reverse=True)
        if new_row_order != list(range(n)):
            changed = True
            A = A[new_row_order, :]
            row_order = [row_order[i] for i in new_row_order]

        steps.append({
            "iteration": iteration,
            "phase": "row_sort",
            "weights": {machine_labels[row_order[i]]: row_weights[new_row_order[i]] if changed else row_weights[i]
                        for i in range(n)},
            "order": [machine_labels[r] for r in row_order],
            "matrix": A.tolist(),
        })

        if not changed:
            break

        # Safety limit
        if iteration > 100:
            break

    # Detect cells (block-diagonal clusters)
    cells = _detect_cells(A, row_order, col_order, machine_labels, part_labels)

    # Detect exceptional parts
    exceptional = _detect_exceptional_parts(
        A, cells, row_order, col_order, machine_labels, part_labels
    )

    # Compute efficiency
    total_ops = int(np.sum(A))
    internal_ops = 0
    for cell in cells:
        row_indices = [row_order.index(mi) for mi in cell["machine_indices"]]
        col_indices = [col_order.index(pi) for pi in cell["part_indices"]]
        for ri in row_indices:
            for ci in col_indices:
                internal_ops += int(A[ri, ci])
    efficiency = internal_ops / total_ops if total_ops > 0 else 0.0

    return {
        "original_matrix": matrix,
        "reordered_matrix": A.tolist(),
        "row_order": row_order,
        "col_order": col_order,
        "machine_labels": machine_labels,
        "part_labels": part_labels,
        "reordered_machine_labels": [machine_labels[i] for i in row_order],
        "reordered_part_labels": [part_labels[j] for j in col_order],
        "steps": steps,
        "cells": cells,
        "exceptional_parts": exceptional,
        "efficiency": round(efficiency, 4),
    }


def _detect_cells(A: np.ndarray, row_order: list, col_order: list,
                  machine_labels: list, part_labels: list) -> list:
    """Detect block-diagonal cells in the reordered matrix.

    Uses a sweep approach: find contiguous blocks along the diagonal
    where 1s cluster together.
    """
    n, m = A.shape
    if n == 0 or m == 0:
        return []

    # Build adjacency: machines that share parts
    visited_rows = set()
    visited_cols = set()
    cells = []

    # Use connected-component approach on the bipartite graph
    row_to_cols = {i: set() for i in range(n)}
    col_to_rows = {j: set() for j in range(m)}
    for i in range(n):
        for j in range(m):
            if A[i, j] == 1:
                row_to_cols[i].add(j)
                col_to_rows[j].add(i)

    visited_r = set()
    visited_c = set()

    def bfs(start_row):
        """BFS to find connected component in bipartite graph."""
        r_set = set()
        c_set = set()
        queue = [("r", start_row)]
        while queue:
            typ, idx = queue.pop(0)
            if typ == "r":
                if idx in r_set:
                    continue
                r_set.add(idx)
                for c in row_to_cols[idx]:
                    if c not in c_set:
                        queue.append(("c", c))
            else:
                if idx in c_set:
                    continue
                c_set.add(idx)
                for r in col_to_rows[idx]:
                    if r not in r_set:
                        queue.append(("r", r))
        return r_set, c_set

    cell_id = 0
    for i in range(n):
        if i in visited_r:
            continue
        if not row_to_cols[i]:
            continue
        r_set, c_set = bfs(i)
        visited_r |= r_set
        visited_c |= c_set
        cell_id += 1
        cells.append({
            "id": cell_id,
            "machines": [machine_labels[row_order[r]] for r in sorted(r_set)],
            "parts": [part_labels[col_order[c]] for c in sorted(c_set)],
            "machine_indices": [row_order[r] for r in sorted(r_set)],
            "part_indices": [col_order[c] for c in sorted(c_set)],
        })

    return cells


def _detect_exceptional_parts(A: np.ndarray, cells: list,
                               row_order: list, col_order: list,
                               machine_labels: list, part_labels: list) -> list:
    """Detect exceptional elements (parts used in more than one cell)."""
    # When there's only one cell or no cells, there are no exceptions
    if len(cells) <= 1:
        return []

    # Map each machine to its cell
    machine_to_cell = {}
    for cell in cells:
        for mi in cell["machine_indices"]:
            machine_to_cell[mi] = cell["id"]

    n, m = A.shape
    exceptional = []
    for j in range(m):
        cells_used = set()
        machines_used = []
        for i in range(n):
            if A[i, j] == 1:
                mi = row_order[i]
                if mi in machine_to_cell:
                    cells_used.add(machine_to_cell[mi])
                    machines_used.append(machine_labels[mi])
        if len(cells_used) > 1:
            exceptional.append({
                "part": part_labels[col_order[j]],
                "cells": sorted(cells_used),
                "machines": machines_used,
            })

    return exceptional
