/** Zustand store for the Machine Layout Solver. */
import { create } from 'zustand';
import type { KingResult, FlowResult, LayoutResult, AnalyzeResult, ConnectivityResult } from './types';
import * as api from './api';

export type Mode = 'king' | 'layout' | 'connectivity';
export type Tab = 'matrix' | 'flow_matrix' | 'triangular' | 'graph' | 'flow' | 'results' | 'structure_matrix' | 'connectivity_graph';

interface SolverState {
  // Mode
  mode: Mode;
  setMode: (m: Mode) => void;

  // Input
  matrix: number[][];
  machineLabels: string[];
  partLabels: string[];
  routing: number[][] | undefined;
  volumes: number[] | undefined;

  // UI
  activeTab: Tab;
  loading: boolean;
  error: string | null;

  // Results
  kingResult: KingResult | null;
  flowResult: FlowResult | null;
  layoutResult: LayoutResult | null;
  analyzeResult: AnalyzeResult | null;
  connectivityResult: ConnectivityResult | null;

  // Actions
  setMatrix: (m: number[][], ml?: string[], pl?: string[]) => void;
  setRouting: (r: number[][] | undefined) => void;
  setVolumes: (v: number[] | undefined) => void;
  setActiveTab: (t: Tab) => void;
  toggleCell: (row: number, col: number) => void;
  addRow: () => void;
  removeRow: () => void;
  addCol: () => void;
  removeCol: () => void;
  generateRandom: (rows: number, cols: number, density: number) => void;
  
  runKing: () => Promise<void>;
  runFlow: () => Promise<void>;
  runLayout: () => Promise<void>;
  runOptimize: () => Promise<void>;
  runAnalyze: () => Promise<void>;
  runConnectivity: () => Promise<void>;
  runConnectivityOptimize: () => Promise<void>;
  importFile: (file: File) => Promise<void>;
  clearResults: () => void;
}

const DEFAULT_MATRIX = [
  [1, 1, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 0, 0],
  [0, 0, 1, 0, 0, 1],
];

const DEFAULT_MACHINE_LABELS = ['M1', 'M2', 'M3', 'M4', 'M5'];
const DEFAULT_PART_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

export const useStore = create<SolverState>((set, get) => ({
  mode: 'king',
  setMode: (m) => set({ 
    mode: m, 
    activeTab: m === 'king' ? 'matrix' : m === 'connectivity' ? 'structure_matrix' : 'flow_matrix' 
  }),

  matrix: DEFAULT_MATRIX,
  machineLabels: DEFAULT_MACHINE_LABELS,
  partLabels: DEFAULT_PART_LABELS,
  routing: undefined,
  volumes: undefined,
  
  activeTab: 'matrix',
  loading: false,
  error: null,
  kingResult: null,
  flowResult: null,
  layoutResult: null,
  analyzeResult: null,
  connectivityResult: null,

  setMatrix: (m, ml, pl) => {
    const rows = m.length;
    const cols = m[0]?.length || 0;
    set({
      matrix: m,
      machineLabels: ml || Array.from({ length: rows }, (_, i) => `M${i + 1}`),
      partLabels: pl || Array.from({ length: cols }, (_, i) => `P${i + 1}`),
    });
  },

  setRouting: (r) => set({ routing: r }),
  setVolumes: (v) => set({ volumes: v }),
  setActiveTab: (t) => set({ activeTab: t }),

  toggleCell: (row, col) => {
    const matrix = get().matrix.map((r) => [...r]);
    matrix[row][col] = matrix[row][col] === 1 ? 0 : 1;
    set({ matrix });
  },

  addRow: () => {
    const { matrix, machineLabels } = get();
    const cols = matrix[0]?.length || 0;
    set({
      matrix: [...matrix, new Array(cols).fill(0)],
      machineLabels: [...machineLabels, `M${machineLabels.length + 1}`],
    });
  },

  removeRow: () => {
    const { matrix, machineLabels } = get();
    if (matrix.length <= 1) return;
    set({
      matrix: matrix.slice(0, -1),
      machineLabels: machineLabels.slice(0, -1),
    });
  },

  addCol: () => {
    const { matrix, partLabels, volumes, routing } = get();
    const newVols = volumes ? [...volumes, 1] : undefined;
    const newRouting = routing ? [...routing, []] : undefined;
    set({
      matrix: matrix.map((r) => [...r, 0]),
      partLabels: [...partLabels, `P${partLabels.length + 1}`],
      volumes: newVols,
      routing: newRouting,
    });
  },

  removeCol: () => {
    const { matrix, partLabels, volumes, routing } = get();
    if ((matrix[0]?.length || 0) <= 1) return;
    set({
      matrix: matrix.map((r) => r.slice(0, -1)),
      partLabels: partLabels.slice(0, -1),
      volumes: volumes ? volumes.slice(0, -1) : undefined,
      routing: routing ? routing.slice(0, -1) : undefined,
    });
  },

  generateRandom: (rows, cols, density) => {
    const matrix = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() < density ? 1 : 0))
    );
    set({
      matrix,
      machineLabels: Array.from({ length: rows }, (_, i) => `M${i + 1}`),
      partLabels: Array.from({ length: cols }, (_, i) => `P${i + 1}`),
      kingResult: null,
      layoutResult: null,
      flowResult: null,
      analyzeResult: null,
      connectivityResult: null,
    });
  },

  runKing: async () => {
    const { matrix, machineLabels, partLabels } = get();
    set({ loading: true, error: null });
    try {
      const result = await api.runKing({ matrix, machine_labels: machineLabels, part_labels: partLabels });
      set({ kingResult: result, loading: false, activeTab: 'matrix' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  runFlow: async () => {
    const { matrix, machineLabels, partLabels, routing, volumes } = get();
    if (!routing || routing.length === 0 || !volumes || volumes.length === 0) {
      set({ error: "Routing and Volumes are required to calculate Flow & Traffic.", loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await api.runFlow({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing, volumes });
      set({ flowResult: result, loading: false, activeTab: 'flow_matrix' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  runLayout: async () => {
    const { matrix, machineLabels, partLabels, routing, volumes } = get();
    if (!routing || routing.length === 0 || !volumes || volumes.length === 0) {
      set({ error: "Routing and Volumes are required to generate the Layout.", loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await api.runLayout({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing, volumes });
      set({ layoutResult: result, loading: false, activeTab: 'graph' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  
  runOptimize: async () => {
    const { matrix, machineLabels, partLabels, routing, volumes } = get();
    if (!routing || routing.length === 0 || !volumes || volumes.length === 0) {
      set({ error: "Routing and Volumes are required to optimize the Layout.", loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await api.runOptimize({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing, volumes });
      set({ layoutResult: result, loading: false, activeTab: 'graph' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  runConnectivity: async () => {
    const { matrix, machineLabels, partLabels, routing } = get();
    if (!routing || routing.length === 0) {
      set({ error: "Routing is required for the connectivity-based chaining method.", loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await api.runConnectivity({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing });
      set({ connectivityResult: result, loading: false, activeTab: 'structure_matrix' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  runConnectivityOptimize: async () => {
    const { matrix, machineLabels, partLabels, routing } = get();
    if (!routing || routing.length === 0) {
      set({ error: "Routing is required for the connectivity-based chaining method.", loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await api.runConnectivityOptimize({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing });
      set({ connectivityResult: result, loading: false, activeTab: 'connectivity_graph' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  runAnalyze: async () => {
    const { matrix, machineLabels, partLabels, routing, volumes } = get();
    set({ loading: true, error: null });
    try {
      const result = await api.runAnalyze({ matrix, machine_labels: machineLabels, part_labels: partLabels, routing, volumes });
      set({ kingResult: result.king, flowResult: result.flow, layoutResult: result.layout, analyzeResult: result, loading: false, activeTab: 'results' });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  importFile: async (file) => {
    set({ loading: true, error: null });
    try {
      const data = await api.importFile(file);
      set({
        matrix: data.matrix,
        machineLabels: data.machine_labels,
        partLabels: data.part_labels,
        loading: false,
        kingResult: null,
        flowResult: null,
        layoutResult: null,
        analyzeResult: null,
        connectivityResult: null,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  clearResults: () => set({ kingResult: null, flowResult: null, layoutResult: null, analyzeResult: null, connectivityResult: null, error: null }),
}));
