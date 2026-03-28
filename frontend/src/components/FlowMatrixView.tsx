import React from 'react';
import { useStore } from '../store';

export default function FlowMatrixView() {
  const flowResult = useStore((s) => s.flowResult || s.layoutResult || s.analyzeResult?.flow);

  if (!flowResult) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] animate-pulse">
        Run 'Calculate Flow & Traffic' to see the flow matrix.
      </div>
    );
  }

  const { flow_matrix, traffic, director_machine, machine_labels } = flowResult;

  return (
    <div className="animate-fade-in flex flex-col h-full gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
            Director Machine
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.1)] text-[var(--color-accent)] flex items-center justify-center text-xl font-bold">
              👑
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-success)] bg-clip-text text-transparent">
                {director_machine}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Machine with max traffic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Bar Chart summary */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
          Machine Traffic (In + Out)
        </h3>
        <div className="flex items-end gap-2 h-32">
          {machine_labels.map((m, i) => {
            const maxTraffic = Math.max(...traffic, 1);
            const height = (traffic[i] / maxTraffic) * 100;
            const isDirector = m === director_machine;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Tooltip */}
                <div className="absolute -top-8 bg-[var(--color-surface-lighter)] px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {m}: {traffic[i]} units
                </div>
                
                <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-t-sm relative flex-1 flex items-end">
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-500 ${isDirector ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-primary-light)] opacity-70 group-hover:opacity-100'}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-[10px] whitespace-nowrap ${isDirector ? 'text-[var(--color-accent)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Directed Flow Matrix */}
      <div className="flex-1 min-h-[300px] flex flex-col">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
          Directed Flow Matrix (Flow[i][j])
          <span className="text-[10px] font-normal normal-case bg-[var(--color-surface-lighter)] px-2 py-0.5 rounded text-gray-400 cursor-help" title="Value represents total flow volume from Row Machine to Column Machine">
            ℹ️ Row → Col
          </span>
        </h3>
        <div className="overflow-auto rounded-xl border border-[var(--color-surface-lighter)] flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 px-4 py-3 bg-[var(--color-surface-light)] text-xs text-[var(--color-text-muted)] text-left whitespace-nowrap border-b border-[var(--color-surface-lighter)]">
                  From \ To
                </th>
                {machine_labels.map((m, j) => (
                  <th key={j} className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] text-xs font-bold text-[var(--color-primary-light)] border-b border-[var(--color-surface-lighter)]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flow_matrix.map((row, i) => (
                <tr key={i} className="group hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="sticky left-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] group-hover:bg-[var(--color-surface-lighter)] text-xs font-bold text-[var(--color-accent)] border-r border-[rgba(255,255,255,0.05)] transition-colors">
                    {machine_labels[i]}
                  </td>
                  {row.map((val, j) => {
                    const isSelf = i === j;
                    return (
                      <td key={j} className="px-4 py-3 text-center border border-[rgba(255,255,255,0.05)] relative group/cell hover:bg-[rgba(255,255,255,0.1)]">
                        {isSelf ? (
                          <span className="text-[var(--color-surface-lighter)]">-</span>
                        ) : (
                          <span className={`font-mono text-sm ${val > 0 ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]' : 'text-[rgba(255,255,255,0.2)]'}`}>
                            {val}
                          </span>
                        )}
                        {!isSelf && val > 0 && (
                          <div className="absolute hidden group-hover/cell:block top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)] px-2 py-1 rounded shadow-xl text-[10px] text-[var(--color-text-muted)] whitespace-nowrap z-30">
                            Flow {machine_labels[i]} <span className="text-[var(--color-accent)]">→</span> {machine_labels[j]}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
