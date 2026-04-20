/** API types matching backend Pydantic models. */

export interface MatrixInput {
  matrix: number[][];
  machine_labels?: string[];
  part_labels?: string[];
  routing?: number[][];
  volumes?: number[];
}

export interface CellInfo {
  id: number;
  machines: string[];
  parts: string[];
  machine_indices: number[];
  part_indices: number[];
}

export interface ExceptionalPart {
  part: string;
  cells: number[];
  machines: string[];
}

export interface StepInfo {
  iteration?: number;
  phase: string;
  description?: string;
  weights?: Record<string, number>;
  order?: string[];
  matrix?: number[][];
}

export interface KingResult {
  original_matrix: number[][];
  reordered_matrix: number[][];
  row_order: number[];
  col_order: number[];
  machine_labels: string[];
  part_labels: string[];
  reordered_machine_labels: string[];
  reordered_part_labels: string[];
  steps: StepInfo[];
  cells: CellInfo[];
  exceptional_parts: ExceptionalPart[];
  efficiency: number;
}

export interface FlowResult {
  flow_matrix: number[][];
  traffic: number[];
  director_machine: string;
  director_index: number;
  machine_labels: string[];
}

export interface LayoutMachine {
  machine: string;
  index: number;
  x: number;
  y: number;
}

export interface DirectedFlow {
  from: string;
  to: string;
  weight: number;
  distance: number;
}

export interface LayoutResult {
  flow_matrix: number[][];
  triangular_matrix: (number | null)[][];
  machine_labels: string[];
  director_machine: string;
  traffic: number[];
  layout: LayoutMachine[];
  adjacency: any[];
  crossings: number;
  long_links: number;
  optimality_ratio: number;
  crossing_flows: { edge1: string[]; edge2: string[] }[];
  flows?: DirectedFlow[];
  off_tram_flows?: DirectedFlow[];
  off_tram_count?: number;
}

export interface AnalyzeResult {
  king: KingResult;
  flow: FlowResult;
  layout: LayoutResult;
  optimization_suggestions: string[];
}

export interface ConnectivityResult {
  structure_matrix: number[][];
  triangular_matrix: (number | null)[][];
  connectivity: number[];
  director_machine: string;
  director_index: number;
  machine_labels: string[];
  layout: LayoutMachine[];
  links: DirectedFlow[];
  off_tram_links: DirectedFlow[];
  off_tram_count: number;
  crossings: number;
  crossing_flows: { edge1: string[]; edge2: string[] }[];
  total_links: number;
  long_links: number;
  optimality_ratio: number;
}

// ────────────────────────────────────────────────────────────────────────────
// SLP TYPES
// ────────────────────────────────────────────────────────────────────────────

export type RelCode = 'A' | 'E' | 'I' | 'O' | 'U' | 'X';

export interface QualitativeRelEntry {
  from: string;
  to: string;
  code: RelCode;
  reason: string;
}

export interface SLPInput {
  routings: Record<string, string[]>;
  volumes?: Record<string, number>;
  qualitative_rel?: QualitativeRelEntry[];
  spaces?: Record<string, number>;
  available_space?: number;
}

export interface SLPMetrics {
  total_cost_initial: number;
  total_cost_optimized: number;
  improvement_percent: number;
  optimality_ratio: number;
  A_relations_satisfied: number;
  X_relations_violated: number;
  adjacency_score: number;
}

export interface SLPOptimizationStep {
  step: number;
  swap: [string, string];
  cost_before: number;
  cost_after: number;
}

export interface SLPResult {
  machines: string[];
  from_to_matrix: Record<string, Record<string, number>>;
  rel_chart: Record<string, Record<string, RelCode>>;
  rel_numeric: Record<string, Record<string, number>>;
  rel_reasons: Record<string, Record<string, string>>;
  scores: Record<string, number>;
  director_machine: string;
  layout: Record<string, { x: number; y: number }>;
  initial_layout: Record<string, { x: number; y: number }>;
  space_requirements: Record<string, number>;
  space_ratio: number;
  metrics: SLPMetrics;
  optimization_steps: SLPOptimizationStep[];
}
