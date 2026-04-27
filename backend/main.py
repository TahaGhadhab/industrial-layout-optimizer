from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from .models import (
    MatrixInput, KingResult, FlowResult, LayoutResult,
    AnalyzeResult, ConnectivityResult,
    SLPInput, SLPResult,
)
from .algorithms.king import king_method
from .algorithms.layout import (
    build_flow_matrix, compute_traffic, select_director,
    triangular_matrix, build_layout, detect_crossings, optimize_layout
)
from .algorithms.connectivity import (
    build_structure_matrix, compute_connectivity,
    select_director as select_director_connectivity,
    triangular_structure_matrix, build_layout_connectivity,
    detect_crossings_connectivity, detect_off_tram,
    optimize_layout_connectivity
)
from .algorithms.analysis import compute_optimization_suggestions
from .algorithms.slp import run_slp
import numpy as np
import pandas as pd
import io
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


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


@app.post("/api/connectivity", response_model=ConnectivityResult)
def run_connectivity(data: MatrixInput):
    """Run connectivity-based chaining method (initial layout)."""
    if not data.routing:
        raise HTTPException(status_code=400, detail="Routing is required for the connectivity-based chaining method.")
    machine_labels, _ = _ensure_labels(data)
    n = len(machine_labels)

    # 1. Build binary structure matrix
    S = build_structure_matrix(data.routing, n)

    # 2. Compute connectivity
    connectivity = compute_connectivity(S)

    # 3. Select director
    director_idx = select_director_connectivity(connectivity)

    # 4. Triangular view
    tri_mat = triangular_structure_matrix(S)

    # 5. Build layout
    lyt = build_layout_connectivity(S, connectivity, machine_labels)

    # 6. Detect crossings & off-tram
    cross_count, cross_flows = detect_crossings_connectivity(lyt, S, machine_labels)
    links, off_tram_links, off_tram_count = detect_off_tram(lyt, S, machine_labels)

    # 7. Compute Ro
    total_links = len(links)
    long_links = off_tram_count
    ro = 1.0 - (cross_count + long_links) / max(1, total_links)

    return ConnectivityResult(
        structure_matrix=S,
        triangular_matrix=tri_mat,
        connectivity=connectivity,
        director_machine=machine_labels[director_idx],
        director_index=director_idx,
        machine_labels=machine_labels,
        layout=lyt,
        links=links,
        off_tram_links=off_tram_links,
        off_tram_count=off_tram_count,
        crossings=cross_count,
        crossing_flows=cross_flows,
        total_links=total_links,
        long_links=long_links,
        optimality_ratio=round(ro, 4)
    )


@app.post("/api/connectivity-optimize", response_model=ConnectivityResult)
def run_connectivity_optimize(data: MatrixInput):
    """Run connectivity-based chaining method with optimization."""
    if not data.routing:
        raise HTTPException(status_code=400, detail="Routing is required for the connectivity-based chaining method.")
    machine_labels, _ = _ensure_labels(data)
    n = len(machine_labels)

    S = build_structure_matrix(data.routing, n)
    connectivity = compute_connectivity(S)
    director_idx = select_director_connectivity(connectivity)
    tri_mat = triangular_structure_matrix(S)

    base_lyt = build_layout_connectivity(S, connectivity, machine_labels)
    opt_lyt, cross_count, long_links_count, ro = optimize_layout_connectivity(base_lyt, S, machine_labels)

    _, cross_flows = detect_crossings_connectivity(opt_lyt, S, machine_labels)
    links, off_tram_links, off_tram_count = detect_off_tram(opt_lyt, S, machine_labels)
    total_links = len(links)

    return ConnectivityResult(
        structure_matrix=S,
        triangular_matrix=tri_mat,
        connectivity=connectivity,
        director_machine=machine_labels[director_idx],
        director_index=director_idx,
        machine_labels=machine_labels,
        layout=opt_lyt,
        links=links,
        off_tram_links=off_tram_links,
        off_tram_count=off_tram_count,
        crossings=cross_count,
        crossing_flows=cross_flows,
        total_links=total_links,
        long_links=long_links_count,
        optimality_ratio=round(ro, 4)
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


@app.post("/api/export-pdf")
def export_pdf(data: dict):
    """Generate a PDF report of the layout optimization results."""
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    h2_style = styles['Heading2']
    normal_style = styles['Normal']
    
    elements = []
    
    # Title
    elements.append(Paragraph("Machine Layout Optimization Report", title_style))
    elements.append(Spacer(1, 12))
    
    # Section 1: Input Summary
    if "king_result" in data or "layout" in data:
        elements.append(Paragraph("1. Optimization Summary", h2_style))
        
        if "king_result" in data and data["king_result"]:
            king = data["king_result"]
            elements.append(Paragraph(f"King's Method Efficiency: {king.get('efficiency', 0):.2f}%", normal_style))
            
        if "layout" in data and data["layout"]:
            lyt = data["layout"]
            elements.append(Paragraph(f"Director Machine: {lyt.get('director_machine', 'N/A')}", normal_style))
            elements.append(Paragraph(f"Crossings: {lyt.get('crossings', 0)}", normal_style))
            elements.append(Paragraph(f"Off-tram Flows: {lyt.get('off_tram_count', 0)}", normal_style))
            elements.append(Paragraph(f"Optimality Ratio (Ro): {lyt.get('optimality_ratio', 0)}", normal_style))
        elements.append(Spacer(1, 12))

    # Section 2: King Results
    if "king_result" in data and data["king_result"]:
        elements.append(Paragraph("2. King's Method Results (Cells)", h2_style))
        king = data["king_result"]
        cells = king.get("cells", [])
        if cells:
            for i, cell in enumerate(cells):
                machines = ", ".join(cell.get("machines", []))
                parts = ", ".join(cell.get("parts", []))
                elements.append(Paragraph(f"<b>Cell {i+1}:</b> Machines: {machines} | Parts: {parts}", normal_style))
        else:
            elements.append(Paragraph("No cells formed.", normal_style))
        elements.append(Spacer(1, 12))

    # Section 3: Flows
    if "flows" in data and data["flows"]:
        elements.append(Paragraph("3. Flow Summary", h2_style))
        flows = data["flows"]
        flow_data = [["From", "To", "Weight", "Distance"]]
        for f in flows:
            flow_data.append([str(f.get("from", "")), str(f.get("to", "")), str(f.get("weight", "")), str(f.get("distance", ""))])
        
        if len(flow_data) > 1:
            t = Table(flow_data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
        elements.append(Spacer(1, 12))

    doc.build(elements)
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=layout_report.pdf"},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
# SLP ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/slp", response_model=SLPResult)
def run_slp_endpoint(data: SLPInput):
    """
    Run the full SLP (Systematic Layout Planning) method.
    Executes all 6 steps: Flow Analysis, REL Chart, ARD, Space, Layout, Optimization.
    """
    try:
        # Convert QualitativeRel models to plain dicts for the algorithm
        qual_list = [
            {
                "from": q.from_machine,
                "to": q.to_machine,
                "code": q.code,
                "reason": q.reason,
            }
            for q in (data.qualitative_rel or [])
        ]
        result = run_slp(
            routings=data.routings,
            volumes=data.volumes,
            qualitative_rel=qual_list if qual_list else None,
            spaces=data.spaces,
            available_space=data.available_space,
        )
        return SLPResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SLP computation error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)