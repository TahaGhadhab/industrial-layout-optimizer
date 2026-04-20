/**
 * SLPResults — Full results panel for SLP method.
 * Shows: director machine, score table, space requirements, metrics, optimization log.
 */
import { useStore } from '../store';
import type { RelCode } from '../types';

const REL_COLOR: Record<RelCode, string> = {
  A: '#FF4444', E: '#FF8C00', I: '#FFD700', O: '#32CD32', U: '#64748b', X: '#8B0000',
};

function MetricCard({ label, value, unit, color, icon }: {
  label: string; value: string | number; unit?: string; color?: string; icon?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-surface-lighter)] bg-[var(--color-surface-light)] p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">{label}</span>
      <div className="flex items-end gap-1.5 mt-auto">
        {icon && <span className="text-xl">{icon}</span>}
        <span className="text-2xl font-black" style={{ color: color || 'var(--color-primary-light)' }}>{value}</span>
        {unit && <span className="text-xs text-[var(--color-text-muted)] mb-0.5">{unit}</span>}
      </div>
    </div>
  );
}

export default function SLPResults() {
  const { slpResult } = useStore();

  if (!slpResult) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl">📋</div>
        <p>Run SLP Analysis to see detailed results</p>
      </div>
    );
  }

  const {
    machines, scores, director_machine, space_requirements, space_ratio,
    metrics, optimization_steps, rel_chart,
  } = slpResult;

  const sortedMachines = [...machines].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  // Count codes
  const codeCounts: Partial<Record<RelCode, number>> = {};
  for (let i = 0; i < machines.length; i++) {
    for (let j = i + 1; j < machines.length; j++) {
      const code = rel_chart[machines[i]]?.[machines[j]] as RelCode;
      if (code) codeCounts[code] = (codeCounts[code] ?? 0) + 1;
    }
  }

  const roPercent = Math.round(metrics.optimality_ratio * 100);
  const roColor = roPercent >= 80 ? '#32CD32' : roPercent >= 60 ? '#FFD700' : '#FF4444';

  return (
    <div className="animate-fade-in flex flex-col gap-5">

      {/* Director Machine Banner */}
      <div className="rounded-xl border border-purple-700/50 bg-purple-900/15 p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-purple-700/30 border-2 border-purple-500 flex items-center justify-center text-xl font-black text-purple-200">
          {director_machine}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Director Machine</div>
          <div className="text-lg font-bold text-white">{director_machine}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Highest REL score — placed at layout center</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-purple-400 uppercase">REL Score</div>
          <div className="text-2xl font-black text-purple-300">{scores[director_machine] ?? 0}</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div>
        <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Performance Metrics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Optimality Ratio Ro"
            value={`${roPercent}%`}
            icon="🎯"
            color={roColor}
          />
          <MetricCard
            label="Cost Reduction"
            value={`↓ ${metrics.improvement_percent}%`}
            icon="📉"
            color="var(--color-success)"
          />
          <MetricCard
            label="Adjacency Score"
            value={metrics.adjacency_score.toFixed(2)}
            icon="🔗"
            color="var(--color-accent)"
          />
          <MetricCard
            label="A-Relations Satisfied"
            value={metrics.A_relations_satisfied}
            unit={`/ ${codeCounts['A'] ?? 0}`}
            icon="✅"
            color="#32CD32"
          />
          <MetricCard
            label="X-Relations Violated"
            value={metrics.X_relations_violated}
            unit={`/ ${codeCounts['X'] ?? 0}`}
            icon={metrics.X_relations_violated === 0 ? '🚫' : '⚠️'}
            color={metrics.X_relations_violated === 0 ? '#32CD32' : '#FF4444'}
          />
          <MetricCard
            label="Optimization Steps"
            value={optimization_steps.length}
            icon="🔄"
            color="var(--color-primary-light)"
          />
        </div>
      </div>

      {/* Cost timeline */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Layout Cost — Before vs After Optimization
        </div>
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 rounded-lg bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] p-3 text-center">
            <div className="text-[10px] text-[var(--color-danger)] uppercase font-bold mb-1">Initial</div>
            <div className="text-xl font-black text-[var(--color-danger)]">{metrics.total_cost_initial.toFixed(2)}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[var(--color-success)] text-lg">→</div>
            <div className="text-xs font-bold text-[var(--color-success)]">−{metrics.improvement_percent}%</div>
          </div>
          <div className="flex-1 rounded-lg bg-purple-900/10 border border-purple-700/40 p-3 text-center">
            <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">Optimized</div>
            <div className="text-xl font-black text-purple-300">{metrics.total_cost_optimized.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Score Table */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Machine REL Scores — Ranked (Step 3)
        </div>
        <div className="divide-y divide-[var(--color-surface-lighter)]">
          {sortedMachines.map((m, rank) => {
            const isDirector = m === director_machine;
            const score = scores[m] ?? 0;
            const maxScore = scores[sortedMachines[0]] ?? 1;
            const barWidth = maxScore > 0 ? (score / maxScore * 100) : 0;
            return (
              <div key={m} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-light)] transition-colors">
                <span className="text-xs text-[var(--color-text-muted)] w-5 flex-shrink-0">#{rank + 1}</span>
                <span className="font-bold text-sm w-10 flex-shrink-0"
                  style={{ color: isDirector ? '#c084fc' : 'var(--color-text)' }}>{m}</span>
                {isDirector && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-700/30 text-purple-300 font-bold flex-shrink-0">Director</span>
                )}
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-lighter)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: isDirector ? '#7c3aed' : 'var(--color-primary)' }} />
                </div>
                <span className="text-sm font-black w-8 text-right"
                  style={{ color: isDirector ? '#a855f7' : 'var(--color-primary-light)' }}>{score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Space Requirements */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-surface-light)] flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Space Requirements (Step 4)
          </span>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            Space ratio: <span className="font-bold text-[var(--color-accent)]">{(space_ratio * 100).toFixed(1)}%</span>
          </span>
        </div>
        <div className="divide-y divide-[var(--color-surface-lighter)]">
          {machines.map(m => {
            const space = space_requirements[m] ?? 1;
            const maxSpace = Math.max(...machines.map(m2 => space_requirements[m2] ?? 1));
            return (
              <div key={m} className="flex items-center gap-3 px-4 py-2">
                <span className="font-bold text-sm w-10 flex-shrink-0 text-[var(--color-accent)]">{m}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-lighter)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${maxSpace > 0 ? (space / maxSpace * 100) : 100}%`, opacity: 0.7 }} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-16 text-right">{space.toFixed(1)} m²</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* REL Distribution */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          REL Code Distribution
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {(Object.entries(codeCounts) as [RelCode, number][])
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
            .map(([code, count]) => (
              <div key={code} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ borderColor: REL_COLOR[code], background: REL_COLOR[code] + '12' }}>
                <span className="font-black text-sm" style={{ color: REL_COLOR[code] }}>{code}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{count} pair{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
