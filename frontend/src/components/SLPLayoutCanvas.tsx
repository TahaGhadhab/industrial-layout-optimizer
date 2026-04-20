/**
 * SLPLayoutCanvas — 2D grid layout visualization.
 * Shows Initial and Optimized layouts side by side.
 * Cells color-coded by REL neighbor satisfaction.
 * Hover shows machine info. Click optimization step to highlight.
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { RelCode } from '../types';

const REL_COLOR: Record<RelCode, string> = {
  A: '#FF4444', E: '#FF8C00', I: '#FFD700', O: '#32CD32', U: '#64748b', X: '#8B0000',
};

const CODE_VALUES: Record<RelCode, number> = { A: 4, E: 3, I: 2, O: 1, U: 0, X: -1 };

type GridPos = Record<string, { x: number; y: number }>;

function normalizeGrid(layout: GridPos, machines: string[]) {
  const xs = machines.map(m => layout[m]?.x ?? 0);
  const ys = machines.map(m => layout[m]?.y ?? 0);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const norm: GridPos = {};
  machines.forEach(m => {
    norm[m] = { x: (layout[m]?.x ?? 0) - minX, y: (layout[m]?.y ?? 0) - minY };
  });
  return norm;
}

function LayoutGrid({
  layout,
  machines,
  rel_chart,
  rel_numeric,
  rel_reasons,
  space_requirements,
  director_machine,
  highlightedMachines,
  onHoverMachine,
  hoveredMachine,
}: {
  layout: GridPos;
  machines: string[];
  rel_chart: Record<string, Record<string, RelCode>>;
  rel_numeric: Record<string, Record<string, number>>;
  rel_reasons: Record<string, Record<string, string>>;
  space_requirements: Record<string, number>;
  director_machine: string;
  highlightedMachines: Set<string>;
  onHoverMachine: (m: string | null) => void;
  hoveredMachine: string | null;
}) {
  const norm = useMemo(() => normalizeGrid(layout, machines), [layout, machines]);

  const xs = machines.map(m => norm[m]?.x ?? 0);
  const ys = machines.map(m => norm[m]?.y ?? 0);
  const gridW = Math.max(...xs) + 1;
  const gridH = Math.max(...ys) + 1;

  const cellSize = Math.max(60, Math.min(100, Math.floor(500 / Math.max(gridW, gridH))));

  // Build grid map: (x,y) -> machine
  const gridMap: Record<string, string> = {};
  machines.forEach(m => {
    const pos = norm[m];
    if (pos) gridMap[`${pos.x},${pos.y}`] = m;
  });

  // Cell color based on REL neighbors
  function getCellStyle(m: string) {
    const pos = norm[m];
    if (!pos) return {};
    const neighbors: { machine: string; dx: number; dy: number }[] = [];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nm = gridMap[`${pos.x+dx},${pos.y+dy}`];
      if (nm) neighbors.push({ machine: nm, dx, dy });
    }

    let hasASatisfied = false;
    let hasXViolated = false;
    neighbors.forEach(({ machine: nm }) => {
      const code = rel_chart[m]?.[nm] as RelCode;
      if (code === 'A') hasASatisfied = true;
      if (code === 'X') hasXViolated = true;
    });

    if (hasXViolated) return { borderColor: '#FF4444', background: 'rgba(255,68,68,0.12)' };
    if (hasASatisfied) return { borderColor: '#32CD32', background: 'rgba(50,205,50,0.08)' };
    return { borderColor: 'var(--color-surface-lighter)', background: 'var(--color-surface-light)' };
  }

  // Lines between adjacent machines
  const lines: { m1: string; m2: string; code: RelCode; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const m1 = gridMap[`${col},${row}`];
      if (!m1) continue;
      const mRight = gridMap[`${col+1},${row}`];
      if (mRight) {
        const code = rel_chart[m1]?.[mRight] as RelCode ?? 'U';
        if (code !== 'U') {
          lines.push({ m1, m2: mRight, code, x1: col, y1: row, x2: col + 1, y2: row });
        }
      }
      const mDown = gridMap[`${col},${row+1}`];
      if (mDown) {
        const code = rel_chart[m1]?.[mDown] as RelCode ?? 'U';
        if (code !== 'U') {
          lines.push({ m1, m2: mDown, code, x1: col, y1: row, x2: col, y2: row + 1 });
        }
      }
    }
  }

  const maxSpace = Math.max(...machines.map(m => space_requirements[m] ?? 1), 1);

  const svgW = (gridW + 1) * cellSize;
  const svgH = (gridH + 1) * cellSize;
  const pad = cellSize / 2;

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>
        {/* Grid lines */}
        {Array.from({ length: gridW + 2 }).map((_, i) => (
          <line key={`v${i}`} x1={pad + i * cellSize} y1={pad} x2={pad + i * cellSize} y2={pad + gridH * cellSize}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {Array.from({ length: gridH + 2 }).map((_, i) => (
          <line key={`h${i}`} x1={pad} y1={pad + i * cellSize} x2={pad + gridW * cellSize} y2={pad + i * cellSize}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Connection lines between adjacent machines */}
        {lines.map((l, idx) => {
          const x1 = pad + l.x1 * cellSize + cellSize / 2;
          const y1 = pad + l.y1 * cellSize + cellSize / 2;
          const x2 = pad + l.x2 * cellSize + cellSize / 2;
          const y2 = pad + l.y2 * cellSize + cellSize / 2;
          const color = REL_COLOR[l.code];
          const isHov = hoveredMachine === l.m1 || hoveredMachine === l.m2;
          const highlighted = highlightedMachines.size > 0 && (highlightedMachines.has(l.m1) || highlightedMachines.has(l.m2));
          return (
            <line key={idx}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth={isHov || highlighted ? 3 : 1.5}
              strokeOpacity={isHov || highlighted ? 0.9 : 0.4}
              strokeDasharray={l.code === 'X' ? '6,4' : 'none'}
            />
          );
        })}

        {/* Machine cells */}
        {machines.map(m => {
          const pos = norm[m];
          if (!pos) return null;
          const isDirector = m === director_machine;
          const isHov = hoveredMachine === m;
          const highlighted = highlightedMachines.size > 0 && highlightedMachines.has(m);
          const space = space_requirements[m] ?? 1;
          const sizeRatio = 0.4 + (space / maxSpace) * 0.45;
          const cellHalf = (cellSize * sizeRatio) / 2;
          const cx = pad + pos.x * cellSize + cellSize / 2;
          const cy = pad + pos.y * cellSize + cellSize / 2;
          const style = getCellStyle(m);

          return (
            <g key={m} transform={`translate(${cx}, ${cy})`}
              onMouseEnter={() => onHoverMachine(m)}
              onMouseLeave={() => onHoverMachine(null)}
              className="cursor-pointer"
            >
              {/* Highlight ring for optimization step */}
              {highlighted && (
                <rect x={-cellHalf - 4} y={-cellHalf - 4} width={(cellHalf + 4) * 2} height={(cellHalf + 4) * 2}
                  rx="10" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="5,3"
                  className="animate-pulse"
                />
              )}
              {/* Director glow */}
              {isDirector && (
                <rect x={-cellHalf - 2} y={-cellHalf - 2} width={(cellHalf + 2) * 2} height={(cellHalf + 2) * 2}
                  rx="9" fill="rgba(168,85,247,0.15)" />
              )}
              {/* Main cell */}
              <rect
                x={-cellHalf} y={-cellHalf}
                width={cellHalf * 2} height={cellHalf * 2}
                rx="8"
                fill={isHov ? 'rgba(99,102,241,0.25)' : highlighted ? 'rgba(251,191,36,0.15)' : (style.background as string || 'var(--color-surface-light)')}
                stroke={isHov ? '#818cf8' : highlighted ? '#fbbf24' : isDirector ? '#a855f7' : (style.borderColor as string || 'var(--color-surface-lighter)')}
                strokeWidth={isDirector || isHov ? 2 : 1.5}
                className="transition-all duration-200"
              />
              {/* Machine label */}
              <text textAnchor="middle" dy={isDirector ? -4 : 4} fontSize={13} fontWeight="bold"
                fill={isDirector ? '#e9d5ff' : '#f1f5f9'} className="select-none pointer-events-none">
                {m}
              </text>
              {isDirector && (
                <text textAnchor="middle" dy={10} fontSize={8} fill="#c084fc" className="select-none pointer-events-none">★</text>
              )}
              {/* Space badge */}
              <text textAnchor="middle" dy={cellHalf - 4} fontSize={8} fill="rgba(148,163,184,0.7)" className="select-none pointer-events-none">
                {space}m²
              </text>
              {/* Hover tooltip */}
              {isHov && (
                <g transform={`translate(0, ${-cellHalf - 50})`}>
                  <rect x="-65" y="-10" width="130" height="48" rx="6"
                    fill="var(--color-surface)" stroke="#818cf8" strokeWidth="1" />
                  <text textAnchor="middle" y="5" fontSize="10" fill="#818cf8" fontWeight="bold"
                    className="select-none pointer-events-none">{m}</text>
                  <text textAnchor="middle" y="18" fontSize="9" fill="var(--color-text-muted)"
                    className="select-none pointer-events-none">Space: {space}m²  |  ({pos.x},{pos.y})</text>
                  {isDirector && (
                    <text textAnchor="middle" y="30" fontSize="9" fill="#c084fc" className="select-none pointer-events-none">★ Director Machine</text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function SLPLayoutCanvas() {
  const { slpResult } = useStore();
  const [view, setView] = useState<'initial' | 'optimized'>('optimized');
  const [hoveredMachine, setHoveredMachine] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  if (!slpResult) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl">📐</div>
        <p>Run SLP Analysis to see the Layout Canvas</p>
      </div>
    );
  }

  const { machines, layout, initial_layout, rel_chart, rel_numeric, rel_reasons, space_requirements, director_machine, optimization_steps, metrics } = slpResult;
  const currentLayout = view === 'initial' ? initial_layout : layout;
  const highlightedMachines = activeStep !== null
    ? new Set(optimization_steps[activeStep - 1]?.swap ?? [])
    : new Set<string>();

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          2D Layout Canvas (Steps 5–6)
        </h3>
        <div className="flex p-1 bg-[var(--color-surface-light)] rounded-lg gap-1">
          <button
            onClick={() => setView('initial')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'initial' ? 'bg-[var(--color-surface-lighter)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            Initial Layout
          </button>
          <button
            onClick={() => setView('optimized')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'optimized' ? 'bg-purple-700 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            ✨ Optimized
          </button>
        </div>
      </div>

      {/* Cost comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--color-surface-lighter)] p-3 bg-[var(--color-surface-light)] text-center">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Initial Cost</div>
          <div className="text-lg font-black text-[var(--color-danger)]">{metrics.total_cost_initial.toFixed(1)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-surface-lighter)] p-3 bg-[var(--color-surface-light)] text-center relative overflow-hidden">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase mb-1">Improvement</div>
          <div className="text-lg font-black text-[var(--color-success)]">↓ {metrics.improvement_percent}%</div>
          {metrics.improvement_percent > 0 && (
            <div className="absolute bottom-0 left-0 h-1 bg-[var(--color-success)] rounded transition-all"
              style={{ width: `${Math.min(100, metrics.improvement_percent)}%` }} />
          )}
        </div>
        <div className="rounded-xl border border-purple-800/40 p-3 bg-purple-900/10 text-center">
          <div className="text-[10px] text-purple-400 uppercase mb-1">Optimized Cost</div>
          <div className="text-lg font-black text-purple-300">{metrics.total_cost_optimized.toFixed(1)}</div>
        </div>
      </div>

      {/* Grid + REL Legend */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--color-surface-light)] flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            {view === 'initial' ? 'Step 5: Initial placement' : 'Step 6: After optimization'}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-success)]">
              <span className="w-3 h-3 rounded border-2 border-[var(--color-success)] inline-block" /> A-satisfied neighbor
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-danger)]">
              <span className="w-3 h-3 rounded border-2 border-[var(--color-danger)] inline-block" /> X-violated neighbor
            </span>
          </div>
        </div>
        <div className="p-4 bg-[var(--color-surface)] overflow-auto">
          <LayoutGrid
            layout={currentLayout}
            machines={machines}
            rel_chart={rel_chart}
            rel_numeric={rel_numeric}
            rel_reasons={rel_reasons}
            space_requirements={space_requirements}
            director_machine={director_machine}
            highlightedMachines={highlightedMachines}
            onHoverMachine={setHoveredMachine}
            hoveredMachine={hoveredMachine}
          />
        </div>
      </div>

      {/* Optimization steps */}
      {optimization_steps.length > 0 && (
        <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Optimization Steps — click to highlight swapped machines
          </div>
          <div className="p-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {optimization_steps.map(step => {
              const isActive = activeStep === step.step;
              const gain = step.cost_before - step.cost_after;
              return (
                <button
                  key={step.step}
                  onClick={() => { setActiveStep(isActive ? null : step.step); setView('optimized'); }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all ${isActive ? 'bg-purple-900/40 border border-purple-600' : 'bg-[var(--color-surface-light)] hover:bg-[var(--color-surface-lighter)]'} border`}
                  style={{ borderColor: isActive ? '#7c3aed' : 'transparent' }}
                >
                  <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: isActive ? '#7c3aed' : 'var(--color-surface-lighter)', color: '#fff' }}>
                    {step.step}
                  </span>
                  <span className="flex-1 text-xs text-[var(--color-text-muted)]">
                    Swap <span className="text-white font-bold">{step.swap[0]}</span> ↔ <span className="text-white font-bold">{step.swap[1]}</span>
                  </span>
                  <span className="text-xs">
                    <span className="text-[var(--color-danger)] line-through">{step.cost_before.toFixed(1)}</span>
                    <span className="text-[var(--color-text-muted)] mx-1">→</span>
                    <span className="text-[var(--color-success)] font-bold">{step.cost_after.toFixed(1)}</span>
                  </span>
                  <span className="text-[10px] text-[var(--color-success)] font-bold ml-auto">−{gain.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {optimization_steps.length === 0 && (
        <div className="text-xs text-center text-[var(--color-text-muted)] py-2">
          ✅ Initial layout was already optimal — no swaps needed.
        </div>
      )}
    </div>
  );
}
