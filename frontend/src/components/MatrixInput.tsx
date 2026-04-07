/** MatrixInput — Editable matrix grid with controls. */
import React, { useState, useRef } from 'react';
import { useStore } from '../store';

export default function MatrixInput() {
  const { mode, matrix, machineLabels, partLabels, routing, volumes, toggleCell, addRow, removeRow, addCol, removeCol, generateRandom, importFile, setRouting, setVolumes } = useStore();
  const [randRows, setRandRows] = useState(5);
  const [randCols, setRandCols] = useState(6);
  const [randDensity, setRandDensity] = useState(0.35);
  const [showGenerator, setShowGenerator] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFile(file);
  };

  const handleVolumeChange = (j: number, val: string) => {
    const v = parseInt(val) || 1;
    const newVols = [...(volumes || Array(partLabels.length).fill(1))];
    newVols[j] = Math.max(1, v);
    setVolumes(newVols);
  };

  const handleRoutingChange = (j: number, val: string) => {
    // Parse "M1, M2" or "1, 2" or "1 2"
    const parsed = val.split(/[, \-→>]+/).filter(Boolean).map(s => {
      const sUpper = s.toUpperCase();
      const idx = machineLabels.findIndex(m => m.toUpperCase() === sUpper);
      if (idx !== -1) return idx;
      // Try to parse as number
      const num = parseInt(s.replace(/\D/g, ''));
      if (!isNaN(num) && num > 0 && num <= machineLabels.length) return num - 1;
      return -1;
    }).filter(i => i !== -1);
    
    const newRoutings = [...(routing || Array(partLabels.length).fill([]))];
    newRoutings[j] = parsed;
    setRouting(newRoutings);
  };

  const getRoutingString = (j: number) => {
    if (!routing || !routing[j]) return '';
    return routing[j].map(idx => machineLabels[idx] || `M${idx+1}`).join(' → ');
  };

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={addRow} className="btn-sm bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white">
          + Row
        </button>
        <button onClick={removeRow} className="btn-sm bg-[var(--color-surface-lighter)] hover:bg-[var(--color-danger)] text-white">
          − Row
        </button>
        <button onClick={addCol} className="btn-sm bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white">
          + Col
        </button>
        <button onClick={removeCol} className="btn-sm bg-[var(--color-surface-lighter)] hover:bg-[var(--color-danger)] text-white">
          − Col
        </button>
        <span className="w-px h-6 bg-[var(--color-surface-lighter)]" />
        <button onClick={() => setShowGenerator(!showGenerator)} className="btn-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-gray-900">
          🎲 Random
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-sm bg-[var(--color-surface-lighter)] hover:bg-[var(--color-primary)] text-white">
          📥 Import
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {matrix.length} machines × {matrix[0]?.length || 0} parts
        </span>
      </div>

      {/* Random generator */}
      {showGenerator && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)] animate-slide-in">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs text-[var(--color-text-muted)]">
              Machines
              <input type="number" min={1} max={20} value={randRows} onChange={(e) => setRandRows(+e.target.value)}
                className="mt-1 w-16 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-sm" />
            </label>
            <label className="flex flex-col text-xs text-[var(--color-text-muted)]">
              Parts
              <input type="number" min={1} max={30} value={randCols} onChange={(e) => setRandCols(+e.target.value)}
                className="mt-1 w-16 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-sm" />
            </label>
            <label className="flex flex-col text-xs text-[var(--color-text-muted)]">
              Density ({Math.round(randDensity * 100)}%)
              <input type="range" min={0.1} max={0.8} step={0.05} value={randDensity} onChange={(e) => setRandDensity(+e.target.value)}
                className="mt-1 w-24" />
            </label>
            <button onClick={() => generateRandom(randRows, randCols, randDensity)}
              className="btn-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-gray-900">
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Matrix grid */}
      <div className="overflow-auto max-h-[60vh] rounded-lg border border-[var(--color-surface-lighter)] pb-2 flex-1">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 px-3 py-2 bg-[var(--color-surface-light)] text-xs text-[var(--color-text-muted)] border-b border-[var(--color-surface-lighter)]">Machines \ Parts</th>
              {partLabels.map((label, j) => (
                <th key={j} className="sticky top-0 z-10 px-3 py-2 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-primary-light)] whitespace-nowrap border-b border-[var(--color-surface-lighter)]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i} className="group">
                <td className="sticky left-0 z-10 px-3 py-2 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-accent)] whitespace-nowrap">
                  {machineLabels[i]}
                </td>
                {row.map((val, j) => (
                  <td key={j} className="p-0">
                    <button
                      onClick={() => toggleCell(i, j)}
                      className={`w-12 h-10 text-sm font-bold transition-all duration-150 border border-[var(--color-surface-lighter)] cursor-pointer
                        ${val === 1
                          ? 'bg-[var(--color-primary)] text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-lighter)]'
                        }`}
                    >
                      {val}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
            {/* Volume row — only for flow-based layout mode */}
            {mode === 'layout' && (
              <tr className="bg-[rgba(16,185,129,0.05)]">
                <td className="sticky left-0 z-10 px-3 py-2 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap border-t border-[var(--color-surface-lighter)]">
                  Volume
                </td>
                {partLabels.map((_, j) => (
                  <td key={j} className="p-1 border border-[var(--color-surface-lighter)]">
                    <input 
                      type="number" min="1" 
                      value={volumes?.[j] || 1}
                      onChange={(e) => handleVolumeChange(j, e.target.value)}
                      className="w-10 text-center bg-transparent text-white text-xs outline-none"
                    />
                  </td>
                ))}
              </tr>
            )}
            {/* Routing row — for flow-based AND connectivity-based modes */}
            {(mode === 'layout' || mode === 'connectivity') && (
              <tr className={mode === 'connectivity' ? 'bg-[rgba(168,85,247,0.05)]' : 'bg-[rgba(16,185,129,0.05)]'}>
                <td className="sticky left-0 z-10 px-3 py-2 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap border-t border-[var(--color-surface-lighter)]">
                  Routing Seq
                </td>
                {partLabels.map((_, j) => (
                  <td key={j} className="p-1 border border-[var(--color-surface-lighter)]">
                    <input 
                      type="text" 
                      placeholder="e.g. M1,M2"
                      value={getRoutingString(j)}
                      onChange={(e) => handleRoutingChange(j, e.target.value)}
                      className="w-10 text-center bg-transparent text-white text-[10px] outline-none"
                      title="Enter machine sequence like 'M1, M3, M2' or '1, 3, 2'"
                    />
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
