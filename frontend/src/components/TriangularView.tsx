/** TriangularView — Upper-triangular bidirectional flow matrix. */
import { useStore } from '../store';

export default function TriangularView() {
  const { layoutResult, analyzeResult } = useStore();
  const res = layoutResult || analyzeResult?.layout;

  if (!res) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl animate-bounce">🔺</div>
        <p>Run <strong>2. Generate Initial Layout</strong> to see the bidirectional flow matrix.</p>
      </div>
    );
  }

  const { triangular_matrix, machine_labels } = res;
  
  // Find max flow for color scaling
  let maxFlow = 1;
  triangular_matrix.forEach(row => {
    row.forEach(val => {
      if (val != null && val > maxFlow) maxFlow = val;
    });
  });

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Bidirectional Flow Matrix
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Sum of flows between machine pairs</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-text-muted)]">Flow Intensity:</span>
          <div className="h-4 w-32 rounded bg-gradient-to-r from-[rgba(16,185,129,0.1)] to-[rgba(16,185,129,0.9)] border border-[var(--color-surface-lighter)]" />
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-[var(--color-surface-lighter)] flex-1 bg-[var(--color-surface)] shadow-inner">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 px-4 py-3 bg-[var(--color-surface-light)] border-b border-[var(--color-surface-lighter)]" />
              {machine_labels.map((l, j) => (
                <th key={j} className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] text-xs font-bold text-[var(--color-primary-light)] whitespace-nowrap border-b border-[var(--color-surface-lighter)]">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {triangular_matrix.map((row, i) => (
              <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                <td className="sticky left-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] text-xs font-bold text-[var(--color-accent)] whitespace-nowrap border-r border-[var(--color-surface-lighter)]">
                  {machine_labels[i]}
                </td>
                {row.map((val, j) => {
                  if (j <= i || val === null) {
                    return (
                      <td key={j} className="px-4 py-3 border border-[rgba(255,255,255,0.05)] text-center bg-[rgba(0,0,0,0.2)]">
                        <span className="text-[var(--color-surface-lighter)] text-xs">—</span>
                      </td>
                    );
                  }
                  
                  const intensity = val / maxFlow;
                  const bgAlpha = 0.1 + (intensity * 0.8);
                  const isHigh = intensity > 0.5;
                  
                  return (
                    <td key={j}
                      className="px-4 py-3 text-center border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:scale-[1.05] cursor-default font-mono text-sm relative group"
                      style={{
                        backgroundColor: val > 0 ? `rgba(16,185,129,${bgAlpha})` : 'transparent',
                        color: val > 0 ? (isHigh ? '#fff' : 'var(--color-success)') : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {val > 0 ? (
                        <span className={isHigh ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] font-bold' : ''}>
                          {val}
                        </span>
                      ) : (
                        0
                      )}
                      
                      {val > 0 && (
                        <div className="absolute hidden group-hover:block top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)] px-2 py-1 rounded shadow-xl text-[10px] text-white whitespace-nowrap z-30">
                          {machine_labels[i]} ↔ {machine_labels[j]}: {val} trips
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
  );
}
