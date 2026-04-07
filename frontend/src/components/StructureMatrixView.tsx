/** StructureMatrixView — Binary structure matrix + connectivity bar chart for connectivity mode. */
import { useStore } from '../store';

export default function StructureMatrixView() {
  const connectivityResult = useStore((s) => s.connectivityResult);

  if (!connectivityResult) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] animate-pulse">
        Run <strong className="mx-1">1. Build Structure Matrix</strong> to see connectivity data.
      </div>
    );
  }

  const { structure_matrix, connectivity, director_machine, machine_labels, triangular_matrix } = connectivityResult;

  return (
    <div className="animate-fade-in flex flex-col h-full gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
            Director Machine
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(168,85,247,0.1)] text-purple-400 flex items-center justify-center text-xl font-bold">
              👑
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {director_machine}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Machine with max connectivity</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
            Total Links
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(99,102,241,0.1)] text-[var(--color-primary-light)] flex items-center justify-center text-xl font-bold">
              🔗
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {connectivityResult.total_links}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Unique undirected links</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connectivity Bar Chart */}
      <div className="p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
          Machine Connectivity (Number of Links)
        </h3>
        <div className="flex items-end gap-2 h-32">
          {machine_labels.map((m, i) => {
            const maxC = Math.max(...connectivity, 1);
            const height = (connectivity[i] / maxC) * 100;
            const isDirector = m === director_machine;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div className="absolute -top-8 bg-[var(--color-surface-lighter)] px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {m}: {connectivity[i]} links
                </div>
                
                <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-t-sm relative flex-1 flex items-end">
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-500 ${isDirector ? 'bg-gradient-to-t from-purple-600 to-pink-400' : 'bg-[var(--color-primary-light)] opacity-70 group-hover:opacity-100'}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-[10px] whitespace-nowrap ${isDirector ? 'text-purple-400 font-bold' : 'text-[var(--color-text-muted)]'}`}>
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structure Matrix (Binary) */}
      <div className="flex-1 min-h-[200px] flex flex-col">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
          Binary Structure Matrix S[i][j]
          <span className="text-[10px] font-normal normal-case bg-[var(--color-surface-lighter)] px-2 py-0.5 rounded text-gray-400 cursor-help" title="1 = link exists between machines, 0 = no link. Symmetric matrix.">
            ℹ️ 1 = link, 0 = none
          </span>
        </h3>
        <div className="overflow-auto rounded-xl border border-[var(--color-surface-lighter)] flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 px-4 py-3 bg-[var(--color-surface-light)] text-xs text-[var(--color-text-muted)] text-left whitespace-nowrap border-b border-[var(--color-surface-lighter)]">
                  S[i][j]
                </th>
                {machine_labels.map((m, j) => (
                  <th key={j} className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] text-xs font-bold text-purple-400 border-b border-[var(--color-surface-lighter)]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {structure_matrix.map((row, i) => (
                <tr key={i} className="group hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="sticky left-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] group-hover:bg-[var(--color-surface-lighter)] text-xs font-bold text-pink-400 border-r border-[rgba(255,255,255,0.05)] transition-colors">
                    {machine_labels[i]}
                  </td>
                  {row.map((val, j) => {
                    const isSelf = i === j;
                    return (
                      <td key={j} className="px-4 py-3 text-center border border-[rgba(255,255,255,0.05)] relative group/cell hover:bg-[rgba(255,255,255,0.1)]">
                        {isSelf ? (
                          <span className="text-[var(--color-surface-lighter)]">—</span>
                        ) : (
                          <span className={`font-mono text-sm font-bold ${
                            val === 1 
                              ? 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]' 
                              : 'text-[rgba(255,255,255,0.15)]'
                          }`}>
                            {val}
                          </span>
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

      {/* Upper-Triangular View */}
      <div className="flex-1 min-h-[200px] flex flex-col">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
          Upper Triangular View
          <span className="text-[10px] font-normal normal-case bg-[var(--color-surface-lighter)] px-2 py-0.5 rounded text-gray-400">
            🔺 i &lt; j only
          </span>
        </h3>
        <div className="overflow-auto rounded-xl border border-[var(--color-surface-lighter)] flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 px-4 py-3 bg-[var(--color-surface-light)] text-xs text-[var(--color-text-muted)] text-left whitespace-nowrap border-b border-[var(--color-surface-lighter)]">
                  T[i][j]
                </th>
                {machine_labels.map((m, j) => (
                  <th key={j} className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] text-xs font-bold text-purple-400 border-b border-[var(--color-surface-lighter)]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {triangular_matrix.map((row, i) => (
                <tr key={i} className="group hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="sticky left-0 z-10 px-4 py-3 bg-[var(--color-surface-light)] group-hover:bg-[var(--color-surface-lighter)] text-xs font-bold text-pink-400 border-r border-[rgba(255,255,255,0.05)] transition-colors">
                    {machine_labels[i]}
                  </td>
                  {row.map((val, j) => (
                    <td key={j} className="px-4 py-3 text-center border border-[rgba(255,255,255,0.05)]">
                      {val === null ? (
                        <span className="text-[var(--color-surface-lighter)]">—</span>
                      ) : (
                        <span className={`font-mono text-sm font-bold ${
                          val === 1 
                            ? 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]' 
                            : 'text-[rgba(255,255,255,0.15)]'
                        }`}>
                          {val}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
