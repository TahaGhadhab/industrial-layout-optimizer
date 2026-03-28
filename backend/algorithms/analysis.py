"""Analysis utilities: crossing flows, optimization suggestions."""
import numpy as np


def detect_crossing_flows(matrix: list[list[int]],
                          routing: list[list[int]] | None,
                          clusters: list[dict],
                          machine_labels: list[str],
                          part_labels: list[str]) -> list[dict]:
    """Detect crossing flows between cells.

    Args:
        matrix: Machine-part incidence matrix.
        routing: Optional routing for each part (list of machine indices in order).
        clusters: List of cluster dicts with 'machine_indices'.
        machine_labels: Labels for machines.
        part_labels: Labels for parts.

    Returns:
        List of crossing flow records.
    """
    if not routing or len(clusters) <= 1:
        return []

    # Map machine index to cluster id
    machine_to_cluster = {}
    for cluster in clusters:
        for mi in cluster["machine_indices"]:
            machine_to_cluster[mi] = cluster["id"]

    flows = []
    for part_idx, route in enumerate(routing):
        if not route or len(route) < 2:
            continue
        part_name = part_labels[part_idx] if part_idx < len(part_labels) else f"P{part_idx+1}"
        for step in range(len(route) - 1):
            from_machine = route[step]
            to_machine = route[step + 1]
            from_cluster = machine_to_cluster.get(from_machine)
            to_cluster = machine_to_cluster.get(to_machine)
            if from_cluster is not None and to_cluster is not None and from_cluster != to_cluster:
                flows.append({
                    "part": part_name,
                    "from_machine": machine_labels[from_machine] if from_machine < len(machine_labels) else f"M{from_machine+1}",
                    "to_machine": machine_labels[to_machine] if to_machine < len(machine_labels) else f"M{to_machine+1}",
                    "from_cell": from_cluster,
                    "to_cell": to_cluster,
                })

    return flows


def compute_optimization_suggestions(clusters: list[dict],
                                      exceptional_parts: list[dict],
                                      crossing_flows: list[dict],
                                      efficiency: float) -> list[str]:
    """Generate optimization suggestions based on analysis results."""
    suggestions = []

    if efficiency < 1.0 and len(exceptional_parts) > 0:
        # Count how often each machine appears in exceptions
        machine_freq = {}
        for ep in exceptional_parts:
            for m in ep.get("machines", []):
                machine_freq[m] = machine_freq.get(m, 0) + 1

        if machine_freq:
            most_problematic = max(machine_freq, key=machine_freq.get)
            suggestions.append(
                f"Consider duplicating machine '{most_problematic}' — it appears in "
                f"{machine_freq[most_problematic]} exceptional part(s), which would reduce inter-cell transfers."
            )

    if len(crossing_flows) > 0:
        # Find most frequent crossing
        flow_pairs = {}
        for f in crossing_flows:
            key = (f["from_cell"], f["to_cell"])
            flow_pairs[key] = flow_pairs.get(key, 0) + 1
        if flow_pairs:
            worst = max(flow_pairs, key=flow_pairs.get)
            suggestions.append(
                f"High traffic between Cell {worst[0]} and Cell {worst[1]} "
                f"({flow_pairs[worst]} crossings). Consider machine relocation to reduce inter-cell flow."
            )

    if efficiency < 0.7:
        suggestions.append(
            "Efficiency is below 70%. Consider creating auxiliary cells for exceptional parts "
            "or re-evaluating the cell formation strategy."
        )

    if len(clusters) == 1:
        suggestions.append(
            "All machines are in a single cell. The matrix may not have a clear block-diagonal structure. "
            "Consider reviewing part assignments or adding more machines."
        )

    if not suggestions:
        suggestions.append(
            "Cell formation looks well-structured. No major optimization needed."
        )

    return suggestions
