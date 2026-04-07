/** FlowView — Crossing flow visualization for physical layout. 
 * Supports both flow-based and connectivity-based crossings.
 */
import { useStore } from '../store';

export default function FlowView() {
  const { layoutResult, analyzeResult, connectivityResult, mode } = useStore();
  
  // Use connectivity result in connectivity mode, layout result otherwise
  const isConnectivity = mode === 'connectivity';
  const res = isConnectivity 
    ? connectivityResult 
    : (layoutResult || analyzeResult?.layout);

  if (!res) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl animate-bounce">❌</div>
        <p>Run the layout generation to analyze edge crossings.</p>
      </div>
    );
  }

  const crossingsCount = res.crossings || 0;
  const crossingFlows = res.crossing_flows || [];

  const accentColor = isConnectivity ? 'rgba(168,85,247,' : 'rgba(239,68,68,';
  const accentLabel = isConnectivity ? 'text-purple-400' : 'text-[var(--color-danger)]';

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Edge Crossings Analysis
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {isConnectivity 
              ? 'Connectivity layout link intersections'
              : 'Physical layout link intersections that disrupt material flow'
            }
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border flex flex-col items-center ${
          crossingsCount === 0 
            ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-[var(--color-success)]' 
            : `bg-[${accentColor}0.1)] border-[${accentColor}0.3)] ${accentLabel}`
        }`}>
          <span className="text-xs uppercase tracking-wide font-bold opacity-80">Total Crossings</span>
          <span className="text-2xl font-black">{crossingsCount}</span>
        </div>
      </div>

      {crossingsCount === 0 ? (
        <div className="p-8 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)] text-center text-[var(--color-success)] animate-slide-in flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center text-3xl">✨</div>
          <h4 className="font-bold text-lg">Perfect Layout!</h4>
          <p className="text-sm opacity-80">No intersecting {isConnectivity ? 'links' : 'material flows'} detected. The layout is planar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className={`text-sm font-bold ${accentLabel} flex items-center gap-2 mb-3 tracking-wide`}>
            ⚠️ DETECTED INTERSECTIONS
          </h4>
          <div className="grid gap-3">
            {crossingFlows.map((cf: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-surface-lighter)] hover:border-[var(--color-danger)] transition-colors group">
                
                {/* Edge 1 */}
                <div className="flex-1 flex items-center justify-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                  <span className={`px-3 py-1 bg-[var(--color-surface)] ${isConnectivity ? 'text-purple-400' : 'text-[var(--color-primary-light)]'} font-bold rounded shadow-sm border border-[var(--color-surface-lighter)]`}>{cf.edge1[0]}</span>
                  <span className="text-[var(--color-text-muted)] text-sm">↔</span>
                  <span className={`px-3 py-1 bg-[var(--color-surface)] ${isConnectivity ? 'text-purple-400' : 'text-[var(--color-primary-light)]'} font-bold rounded shadow-sm border border-[var(--color-surface-lighter)]`}>{cf.edge1[1]}</span>
                </div>

                <div className="flex justify-center text-[var(--color-danger)] opacity-50 font-bold text-xl group-hover:scale-125 transition-transform group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  ❌
                </div>

                {/* Edge 2 */}
                <div className="flex-1 flex items-center justify-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                  <span className={`px-3 py-1 bg-[var(--color-surface)] ${isConnectivity ? 'text-pink-400' : 'text-[var(--color-accent)]'} font-bold rounded shadow-sm border border-[var(--color-surface-lighter)]`}>{cf.edge2[0]}</span>
                  <span className="text-[var(--color-text-muted)] text-sm">↔</span>
                  <span className={`px-3 py-1 bg-[var(--color-surface)] ${isConnectivity ? 'text-pink-400' : 'text-[var(--color-accent)]'} font-bold rounded shadow-sm border border-[var(--color-surface-lighter)]`}>{cf.edge2[1]}</span>
                </div>

              </div>
            ))}
          </div>
          
          <div className={`mt-6 p-4 rounded-lg ${isConnectivity ? 'bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.2)]' : 'bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]'} text-[var(--color-text-muted)] text-xs leading-relaxed flex items-start gap-3`}>
            <span className={`${isConnectivity ? 'text-purple-400' : 'text-blue-400'} text-lg mt-0.5`}>💡</span>
            <p>
              Crossings represent points where {isConnectivity ? 'machine links' : 'material handling paths'} intersect, increasing congestion risk. Try running <strong className="text-white">Optimization</strong> to swap machines and reduce these intersections while maximizing the Ro (Optimality Ratio).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
