/** API client for backend endpoints. */
import type { MatrixInput, KingResult, FlowResult, LayoutResult, AnalyzeResult, ConnectivityResult, SLPInput, SLPResult } from './types';

const BASE = import.meta.env.VITE_API_URL || 'https://industrial-layout-optimizer.onrender.com/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function runKing(input: MatrixInput): Promise<KingResult> {
  return post<KingResult>('/king', input);
}

export async function runFlow(input: MatrixInput): Promise<FlowResult> {
  return post<FlowResult>('/flow', input);
}

export async function runLayout(input: MatrixInput): Promise<LayoutResult> {
  return post<LayoutResult>('/layout', input);
}

export async function runOptimize(input: MatrixInput): Promise<LayoutResult> {
  return post<LayoutResult>('/optimize', input);
}

export async function runAnalyze(input: MatrixInput): Promise<AnalyzeResult> {
  return post<AnalyzeResult>('/analyze', input);
}

export async function runConnectivity(input: MatrixInput): Promise<ConnectivityResult> {
  return post<ConnectivityResult>('/connectivity', input);
}

export async function runConnectivityOptimize(input: MatrixInput): Promise<ConnectivityResult> {
  return post<ConnectivityResult>('/connectivity-optimize', input);
}

export async function importFile(file: File): Promise<{ matrix: number[][]; machine_labels: string[]; part_labels: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/import`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Import failed');
  return res.json();
}

export async function exportResults(data: unknown): Promise<Blob> {
  const res = await fetch(`${BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function runSLP(input: SLPInput): Promise<SLPResult> {
  return post<SLPResult>('/slp', input);
}
