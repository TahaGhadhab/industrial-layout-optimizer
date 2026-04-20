"""Pydantic models for API request/response."""
from pydantic import BaseModel, Field
from typing import Optional, Any


class MatrixInput(BaseModel):
    """Input matrix with machine and part labels."""
    matrix: list[list[int]]
    machine_labels: Optional[list[str]] = None
    part_labels: Optional[list[str]] = None
    routing: Optional[list[list[int]]] = None  # routing[part_idx] = [machine_idx sequence]
    volumes: Optional[list[int]] = None  # production volume per part


class KingResult(BaseModel):
    """Result of King's method."""
    original_matrix: list[list[int]]
    reordered_matrix: list[list[int]]
    row_order: list[int]
    col_order: list[int]
    machine_labels: list[str]
    part_labels: list[str]
    reordered_machine_labels: list[str]
    reordered_part_labels: list[str]
    steps: list[dict]  # step-by-step trace
    cells: list[dict]  # detected cells
    exceptional_parts: list[dict]
    efficiency: float


class FlowResult(BaseModel):
    """Result of step 1-3: Flow matrix and Traffic computation."""
    flow_matrix: list[list[int]]
    traffic: list[int]
    director_machine: str
    director_index: int
    machine_labels: list[str]


class LayoutResult(BaseModel):
    """Result of physical layout generation and optimization."""
    flow_matrix: list[list[int]]
    triangular_matrix: list[list[Optional[int]]]
    machine_labels: list[str]
    director_machine: str
    traffic: list[int]
    layout: list[dict]  # {machine: "M1", index: 0, x: 0, y: 0}
    adjacency: list[dict]  # adjacency list of distances or links
    crossings: int
    long_links: int
    optimality_ratio: float  # Ro metric
    crossing_flows: list[dict]  # detailed crossings for highlighting
    
    # Aliases requested by specific test suites / requirements
    positions: Optional[list[dict]] = None
    flows: Optional[list[dict]] = None
    director: Optional[str] = None
    
    # Directed flow metrics
    off_tram_flows: list[dict] = []
    off_tram_count: int = 0


class ConnectivityResult(BaseModel):
    """Result of the connectivity-based chaining method."""
    structure_matrix: list[list[int]]          # Binary structure matrix S
    triangular_matrix: list[list[Optional[int]]]  # Upper-triangular view
    connectivity: list[int]                    # Connectivity score per machine
    director_machine: str                      # Machine with max connectivity
    director_index: int
    machine_labels: list[str]
    layout: list[dict]                         # {machine, index, x, y}
    links: list[dict]                          # All links (undirected, weight=1)
    off_tram_links: list[dict]                 # Long-distance links
    off_tram_count: int
    crossings: int
    crossing_flows: list[dict]
    total_links: int
    long_links: int
    optimality_ratio: float                    # Ro metric


class AnalyzeResult(BaseModel):
    """Full analysis result combining both methods."""
    king: KingResult
    flow: FlowResult
    layout: LayoutResult
    optimization_suggestions: list[str]


# ─────────────────────────────────────────────────────────────────────────────
# SLP MODELS
# ─────────────────────────────────────────────────────────────────────────────

class QualitativeRel(BaseModel):
    """A single qualitative relationship entry."""
    from_machine: str = Field(alias="from")
    to_machine: str = Field(alias="to")
    code: str  # A / E / I / O / U / X
    reason: str = ""

    model_config = {"populate_by_name": True}


class SLPInput(BaseModel):
    """Full SLP request body."""
    routings: dict[str, list[str]]              # {"P1": ["M1", "M2", "M3"]}
    volumes: Optional[dict[str, float]] = None  # {"P1": 150}
    qualitative_rel: Optional[list[QualitativeRel]] = []
    spaces: Optional[dict[str, float]] = None   # {"M1": 20}
    available_space: Optional[float] = None


class SLPMetrics(BaseModel):
    total_cost_initial: float
    total_cost_optimized: float
    improvement_percent: float
    optimality_ratio: float
    A_relations_satisfied: int
    X_relations_violated: int
    adjacency_score: float


class SLPOptimizationStep(BaseModel):
    step: int
    swap: list[str]
    cost_before: float
    cost_after: float


class SLPResult(BaseModel):
    """Full SLP result payload."""
    machines: list[str]
    from_to_matrix: dict[str, Any]
    rel_chart: dict[str, Any]        # {"M1": {"M2": "A", ...}}
    rel_numeric: dict[str, Any]      # {"M1": {"M2": 4, ...}}
    rel_reasons: dict[str, Any]      # {"M1": {"M2": "noise", ...}}
    scores: dict[str, int]
    director_machine: str
    layout: dict[str, Any]           # final optimized layout
    initial_layout: dict[str, Any]   # before optimization
    space_requirements: dict[str, float]
    space_ratio: float
    metrics: SLPMetrics
    optimization_steps: list[SLPOptimizationStep]
