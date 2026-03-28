from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from .models import MatrixInput, KingResult, FlowResult, LayoutResult, AnalyzeResult
from .algorithms.king import king_method
from .algorithms.layout import (
    build_flow_matrix, compute_traffic, select_director,
    triangular_matrix, build_layout, detect_crossings, optimize_layout
)
from .algorithms.analysis import compute_optimization_suggestions
import numpy as np
import pandas as pd
import io
import json


app = FastAPI(title="Machine Layout Solver", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_labels(data: MatrixInput):
    """Generate default labels if not provided."""
    n = len(data.matrix)
    m = len(data.matrix[0]) if n > 0 else 0
    machine_labels = data.machine_labels or [f"M{i+1}" for i in range(n)]
    part_labels = data.part_labels or [f"P{j+1}" for j in range(m)]
    return machine_labels, part_labels

def _build_directed_flows(lyt, flow, machine_labels):
    n = len(machine_labels)
    pos = {item["index"]: (item["x"], item["y"]) for item in lyt}
    flows_list = []
    off_tram_flows = []
    off_tram_count = 0
    for i in range(n):
        for j in range(n):
            if flow[i][j] > 0:
                dist_sq = (pos[i][0] - pos[j][0])**2 + (pos[i][1] - pos[j][1])**2
                dist = round(np.sqrt(dist_sq), 2)
                edge = {
                    "from": machine_labels[i],
                    "to": machine_labels[j],
                    "weight": flow[i][j],
                    "distance": dist
                }
                flows_list.append(edge)
                if dist_sq > 2.5:
                    off_tram_flows.append(edge)
                    off_tram_count += 1
    return flows_list, off_tram_flows, off_tram_count


@app.post("/api/king", response_model=KingResult)
def run_king(data: MatrixInput):
    """Run King's method on the input matrix."""
    machine_labels, part_labels = _ensure_labels(data)
    result = king_method(data.matrix, machine_labels, part_labels)
    return KingResult(**result)


@app.post("/api/flow", response_model=FlowResult)
def run_flow(data: MatrixInput):
    """Calculate flow matrix and traffic."""
    if not data.routing or not data.volumes:
        raise HTTPException(status_code=400, detail="Routing and volumes are required for Flow Layout computation.")
    machine_labels, _ = _ensure_labels(data)
    n = len(machine_labels)
    flow = build_flow_matrix(data.routing, data.volumes, n)
    traffic = compute_traffic(flow)
    director_idx = select_director(traffic)
    return FlowResult(
        flow_matrix=flow,
        traffic=traffic,
        director_machine=machine_labels[director_idx],
        director_index=director_idx,
        machine_labels=machine_labels
    )


@app.post("/api/layout", response_model=LayoutResult)
def run_layout(data: MatrixInput):
    """Generate initial physical layout based on flow."""
    if not data.routing or not data.volumes:
        raise HTTPException(status_code=400, detail="Routing and volumes are required for physical layout generation.")
    machine_labels, _ = _ensure_labels(data)
    n = len(machine_labels)
    flow = build_flow_matrix(data.routing, data.volumes, n)
    traffic = compute_traffic(flow)
    director_idx = select_director(traffic)
    
    tri_mat = triangular_matrix(flow)
    lyt = build_layout(flow, traffic, machine_labels)
    cross_count, cross_flows = detect_crossings(lyt, flow, machine_labels)
    
    # Calculate initial Ro
    long_links = 0
    total_links = 0
    pos = {item["index"]: (item["x"], item["y"]) for item in lyt}
    for i in range(n):
        for j in range(i+1, n):
            if flow[i][j] + flow[j][i] > 0:
                total_links += 1
                dist = (pos[i][0] - pos[j][0])**2 + (pos[i][1] - pos[j][1])**2
                if dist > 2.5: # sqrt(2.5) > 1.5 distance
                    long_links += 1
    
    ro = 1.0 - (cross_count + long_links) / max(1, total_links)
    
    flows_list, off_tram_flows, off_tram_count = _build_directed_flows(lyt, flow, machine_labels)
    
    return LayoutResult(
        flow_matrix=flow,
        triangular_matrix=tri_mat,
        machine_labels=machine_labels,
        director_machine=machine_labels[director_idx],
        traffic=traffic,
        layout=lyt,
        adjacency=[],
        crossings=cross_count,
        long_links=long_links,
        optimality_ratio=round(ro, 4),
        crossing_flows=cross_flows,
        positions=lyt,
        flows=flows_list,
        director=machine_labels[director_idx],
        off_tram_flows=off_tram_flows,
        off_tram_count=off_tram_count
    )


@app.post("/api/optimize", response_model=LayoutResult)
def run_optimize(data: MatrixInput):
    """Optimize the physical layout for crossing minimal and Ro maximization."""
    if not data.routing or not data.volumes:
        raise HTTPException(status_code=400, detail="Routing and volumes are required to optimize the layout.")
    machine_labels, _ = _ensure_labels(data)
    n = len(machine_labels)
    flow = build_flow_matrix(data.routing, data.volumes, n)
    traffic = compute_traffic(flow)
    director_idx = select_director(traffic)
    
    tri_mat = triangular_matrix(flow)
    base_lyt = build_layout(flow, traffic, machine_labels)
    opt_lyt, cross_count, long_links, ro = optimize_layout(base_lyt, flow, machine_labels)
    _, cross_flows = detect_crossings(opt_lyt, flow, machine_labels)
    
    flows_list, off_tram_flows, off_tram_count = _build_directed_flows(opt_lyt, flow, machine_labels)
    
    return LayoutResult(
        flow_matrix=flow,
        triangular_matrix=tri_mat,
        machine_labels=machine_labels,
        director_machine=machine_labels[director_idx],
        traffic=traffic,
        layout=opt_lyt,
        adjacency=[],
        crossings=cross_count,
        long_links=long_links,
        optimality_ratio=round(ro, 4),
        crossing_flows=cross_flows,
        positions=opt_lyt,
        flows=flows_list,
        director=machine_labels[director_idx],
        off_tram_flows=off_tram_flows,
        off_tram_count=off_tram_count
    )


@app.post("/api/analyze", response_model=AnalyzeResult)
def run_analyze(data: MatrixInput):
    """Run full analysis: both methods + suggestions."""
    # This combines king and optimize layout
    king_res = run_king(data)
    flow_res = run_flow(data)
    opt_res = run_optimize(data)
    
    suggestions = compute_optimization_suggestions(
        king_res.cells,
        king_res.exceptional_parts,
        [], # no classic crossing flows required here anymore, replaced by layout crossings
        king_res.efficiency
    )
    
    return AnalyzeResult(
        king=king_res,
        flow=flow_res,
        layout=opt_res,
        optimization_suggestions=suggestions
    )


@app.post("/api/import")
async def import_file(file: UploadFile = File(...)):
    """Import matrix from CSV or Excel file."""
    content = await file.read()
    filename = file.filename or ""

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content), index_col=0)
        else:
            df = pd.read_csv(io.BytesIO(content), index_col=0)

        matrix = df.values.astype(int).tolist()
        machine_labels = [str(x) for x in df.index.tolist()]
        part_labels = [str(x) for x in df.columns.tolist()]

        return {
            "matrix": matrix,
            "machine_labels": machine_labels,
            "part_labels": part_labels,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/export")
def export_results(data: dict):
    """Export results as Excel file."""
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # Original matrix
        if "matrix" in data:
            ml = data.get("machine_labels", [f"M{i+1}" for i in range(len(data["matrix"]))])
            pl = data.get("part_labels", [f"P{j+1}" for j in range(len(data["matrix"][0]))])
            df_orig = pd.DataFrame(data["matrix"], index=ml, columns=pl)
            df_orig.to_excel(writer, sheet_name="Original Matrix")

        # King's result
        if "king" in data and data["king"]:
            king = data["king"]
            if "reordered_matrix" in king:
                df_king = pd.DataFrame(
                    king["reordered_matrix"],
                    index=king.get("reordered_machine_labels", []),
                    columns=king.get("reordered_part_labels", []),
                )
                df_king.to_excel(writer, sheet_name="King Result")

        # Chaining result
        if "chaining" in data and data["chaining"]:
            ch = data["chaining"]
            if "link_matrix" in ch:
                ml = ch.get("machine_labels", [])
                df_link = pd.DataFrame(ch["link_matrix"], index=ml, columns=ml)
                df_link.to_excel(writer, sheet_name="Link Matrix")

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=layout_solver_results.xlsx"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)