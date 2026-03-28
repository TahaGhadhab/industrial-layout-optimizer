/** ResultsPanel — Comprehensive results dashboard. */
import { useStore } from '../store';

const CELL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

function EfficiencyGauge({ value, label, subtitle }: { value: number; label: string; subtitle?: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - value);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-surface-lighter)" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        <text x="50" y="47" textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="Inter">{pct}%</text>
        <text x="50" y="63" textAnchor="middle" fill="var(--color-text-muted)" fontSize="8" fontFamily="Inter">{subtitle || "efficiency"}</text>
      </svg>
      <span className="text-xs font-bold text-[var(--color-text)] mt-2">{label}</span>
    </div>
  );
}

function StatCard({ label, value, icon, colorClass }: { label: string; value: string | number; icon: string; colorClass: string }) {
  return (
    <div className={`p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)] flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function ResultsPanel() {
  const { kingResult, layoutResult, flowResult, analyzeResult, mode } = useStore();

  const activeKing = mode === 'king' ? kingResult || analyzeResult?.king : null;
  const activeLayout = mode === 'layout' ? layoutResult || analyzeResult?.layout : null;
  const activeFlow = mode === 'layout' ? flowResult || activeLayout : null; // fallback to layout if flow alone not present

  if (!activeKing && !activeLayout && !activeFlow) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64 text-[var(--color-text-muted)]">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>Run an algorithm to see the results</p>
        </div>
      </div>
    );
  }

  const suggestions = analyzeResult?.optimization_suggestions || [];

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Active Results Section */}
      {mode === 'king' && activeKing && (
        <div className="space-y-6">
          <div className="flex items-center justify-center p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
            <EfficiencyGauge value={activeKing.efficiency} label="King's Method" subtitle="Grp Efficiency" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeKing.cells.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                  Detected Machine Cells
                </h3>
                <div className="space-y-2">
                  {activeKing.cells.map((cell) => (
                    <div key={cell.id} className="p-3 rounded-lg border border-[var(--color-surface-lighter)] bg-[var(--color-surface-light)]"
                      style={{ borderLeftWidth: 4, borderLeftColor: CELL_COLORS[(cell.id - 1) % CELL_COLORS.length] }}>
                      <div className="font-bold text-sm mb-1" style={{ color: CELL_COLORS[(cell.id - 1) % CELL_COLORS.length] }}>
                        Cell {cell.id}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        <strong className="text-white">Machines:</strong> {cell.machines.join(', ')}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        <strong className="text-[var(--color-success)]">Parts:</strong> {cell.parts.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exceptional parts */}
            {activeKing.exceptional_parts?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-danger)] uppercase tracking-wide mb-3">
                  ⚠️ Exceptional Parts (Hors Trame)
                </h3>
                <div className="space-y-2">
                  {activeKing.exceptional_parts.map((ep, i) => (
                    <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] text-sm">
                      <div className="font-bold text-[var(--color-danger)]">{ep.part}</div>
                      <div className="text-[var(--color-text-muted)] text-xs">
                        Spans Cells: <span className="font-semibold text-white">{ep.cells.join(', ')}</span> 
                        <span className="ml-2">(via {ep.machines.join(', ')})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'layout' && (activeFlow || activeLayout) && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeLayout && (
              <div className="col-span-1 md:col-span-1 flex items-center justify-center p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)]">
                <EfficiencyGauge value={activeLayout.optimality_ratio} label="Ro Metric" subtitle="Optimality" />
              </div>
            )}
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${activeLayout ? 'md:col-span-2' : 'md:col-span-3'}`}>
              {activeFlow && (
                <StatCard 
                  label="Director Machine" 
                  value={activeFlow.director_machine} 
                  icon="👑" 
                  colorClass="bg-[rgba(16,185,129,0.1)] text-[var(--color-success)]" 
                />
              )}
              {activeLayout && (
                <>
                  <StatCard 
                    label="Edge Crossings" 
                    value={activeLayout.crossings} 
                    icon="❌" 
                    colorClass={activeLayout.crossings === 0 ? "bg-[rgba(16,185,129,0.1)] text-[var(--color-success)]" : "bg-[rgba(239,68,68,0.1)] text-[var(--color-danger)]"} 
                  />
                  <StatCard 
                    label="Off-Tram Flows" 
                    value={`${activeLayout.off_tram_count || 0} / ${activeLayout.flows?.length || 0}`} 
                    icon="🔴" 
                    colorClass={(activeLayout.off_tram_count || 0) === 0 ? "bg-[rgba(16,185,129,0.1)] text-[var(--color-success)]" : "bg-[rgba(239,68,68,0.1)] text-[var(--color-danger)]"} 
                  />
                </>
              )}
            </div>
          </div>
          
          {activeLayout && (activeLayout.crossings > 0 || (activeLayout.off_tram_count || 0) > 0) && (
            <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)]">
              <h3 className="text-sm font-semibold text-[var(--color-danger)] mb-2 flex items-center gap-2">
                <span>⚠️</span> Layout Inefficiencies Detected
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                This layout has {activeLayout.crossings} edge crossing(s) and {activeLayout.off_tram_count || 0} off-tram flow(s) 
                ({Math.round(((activeLayout.off_tram_count || 0) / Math.max(1, activeLayout.flows?.length || 1)) * 100)}% ratio). 
                Try using the <strong>Optimize Layout</strong> button to automatically rearrange machines around the director to maximize the $R_o$ metric and minimize off-tram flows.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Optimization suggestions */}
      {suggestions.length > 0 && (
        <div className="animate-slide-in">
          <h3 className="text-sm font-semibold text-[var(--color-primary-light)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <span>💡</span> Global Optimization Insights
          </h3>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-sm text-[var(--color-text-muted)] shadow-inner">
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
