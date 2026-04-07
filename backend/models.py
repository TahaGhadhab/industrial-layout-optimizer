"""Pydantic models for API request/response."""
from pydantic import BaseModel
from typing import Optional


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
