/**
 * SLPRelChart — Color-coded triangular REL chart display.
 * Hover on any cell to see the REL code + numeric value + reason.
 */
import { useState } from 'react';
import { useStore } from '../store';
import type { RelCode } from '../types';

const REL_COLORS: Record<RelCode, { bg: string; text: string; border: string }> = {
  A: { bg: 'rgba(255,68,68,0.15)',   text: '#FF4444', border: '#FF4444' },
  E: { bg: 'rgba(255,140,0,0.15)',   text: '#FF8C00', border: '#FF8C00' },
  I: { bg: 'rgba(255,215,0,0.15)',   text: '#FFD700', border: '#FFD700' },
  O: { bg: 'rgba(50,205,50,0.15)',   text: '#32CD32', border: '#32CD32' },
  U: { bg: 'rgba(148,163,184,0.06)', text: '#64748b', border: '#334155' },
  X: { bg: 'rgba(139,0,0,0.15)',     text: '#c0392b', border: '#8B0000' },
};

const REL_NUMERIC: Record<RelCode, number> = { A: 4, E: 3, I: 2, O: 1, U: 0, X: -1 };

const REL_MEANINGS: Record<RelCode, string> = {
  A: 'Absolutely Necessary',
  E: 'Essential',
  I: 'Important',
  O: 'Ordinary',
  U: 'Unimportant',
  X: 'Undesirable',
};

export default function SLPRelChart() {
  const { slpResult } = useStore();
  const [hovered, setHovered] = useState<{ mi: string; mj: string } | null>(null);

  if (!slpResult) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl">📊</div>
        <p>Run SLP Analysis to see the REL Chart</p>
      </div>
    );
  }

  const { machines, rel_chart, rel_numeric, rel_reasons, from_to_matrix } = slpResult;
  const hoveredCell = hovered ? rel_chart[hovered.mi]?.[hovered.mj] as RelCode | undefined : undefined;

  // Summary counts
  const codeCounts: Record<RelCode, number> = { A: 0, E: 0, I: 0, O: 0, U: 0, X: 0 };
  for (let i = 0; i < machines.length; i++) {
    for (let j = i + 1; j < machines.length; j++) {
      const code = rel_chart[machines[i]]?.[machines[j]] as RelCode;
      if (code) codeCounts[code]++;
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          REL Chart — Activity Relationship Values
        </h3>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {(Object.keys(REL_COLORS) as RelCode[]).map(code => (
            <span key={code} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
              style={{ color: REL_COLORS[code].text, borderColor: REL_COLORS[code].border, background: REL_COLORS[code].bg }}>
              {code}
              {codeCounts[code] > 0 && <span className="text-[10px] opacity-70">×{codeCounts[code]}</span>}
              {code === 'X' && <span className="text-[9px]">···</span>}
            </span>
          ))}
        </div>
      </div>

      {/* FROM-TO matrix compact view */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--color-surface-light)] flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">FROM-TO Matrix (Step 1)</span>
        </div>
        <div className="overflow-x-auto p-3">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-text-muted)] text-left text-xs border border-[var(--color-surface-lighter)]">FROM ↓ TO →</th>
                {machines.map(mj => (
                  <th key={mj} className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-primary-light)] font-bold text-center border border-[var(--color-surface-lighter)]">{mj}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machines.map(mi => (
                <tr key={mi}>
                  <td className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-accent)] font-bold border border-[var(--color-surface-lighter)]">{mi}</td>
                  {machines.map(mj => {
                    const val = mi === mj ? null : (from_to_matrix[mi]?.[mj] || 0);
                    return (
                      <td key={mj} className="px-3 py-2 text-center border border-[var(--color-surface-lighter)]"
                        style={{ background: mi === mj ? 'var(--color-surface-light)' : val && val > 0 ? 'rgba(99,102,241,0.08)' : 'transparent', color: mi === mj ? '#334155' : val && val > 0 ? '#818cf8' : 'var(--color-text-muted)' }}>
                        {mi === mj ? '—' : (val || 0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REL Chart triangular */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--color-surface-light)] flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">REL Chart (Step 2) — Hover for details</span>
        </div>
        <div className="overflow-x-auto p-3">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-text-muted)] text-xs border border-[var(--color-surface-lighter)] min-w-[60px]">Machine</th>
                {machines.slice(1).map(mj => (
                  <th key={mj} className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-primary-light)] font-bold text-center text-xs border border-[var(--color-surface-lighter)] min-w-[60px]">{mj}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machines.slice(0, -1).map((mi, i) => (
                <tr key={mi}>
                  <td className="px-3 py-2 bg-[var(--color-surface-light)] text-[var(--color-accent)] font-bold text-xs border border-[var(--color-surface-lighter)]">{mi}</td>
                  {/* Offset empty cells for triangular shape */}
                  {machines.slice(1, i + 1).map(mj => (
                    <td key={mj} className="border border-[var(--color-surface-lighter)] bg-[var(--color-surface)]" />
                  ))}
                  {/* Actual REL cells */}
                  {machines.slice(i + 1).map(mj => {
                    const code = rel_chart[mi]?.[mj] as RelCode | undefined;
                    if (!code) return <td key={mj} className="border border-[var(--color-surface-lighter)]" />;
                    const colors = REL_COLORS[code];
                    const isHov = hovered?.mi === mi && hovered?.mj === mj;
                    const flow = from_to_matrix[mi]?.[mj] || 0;
                    const reason = rel_reasons[mi]?.[mj] || '';

                    return (
                      <td key={mj}
                        className="relative border border-[var(--color-surface-lighter)] transition-all duration-150 cursor-pointer group"
                        style={{
                          background: isHov ? colors.text + '30' : colors.bg,
                          borderColor: isHov ? colors.border : undefined,
                        }}
                        onMouseEnter={() => setHovered({ mi, mj })}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <div className="flex flex-col items-center justify-center min-w-[60px] py-2 px-1 select-none">
                          <span className="text-base font-black leading-none" style={{ color: colors.text }}>{code}</span>
                          <span className="text-[10px] font-medium mt-0.5" style={{ color: colors.text + 'aa' }}>
                            {code === 'X' ? '−1' : `+${REL_NUMERIC[code]}`}
                          </span>
                          {code === 'X' && (
                            <span className="text-[8px] tracking-widest mt-0.5" style={{ color: colors.text }}>···</span>
                          )}
                        </div>
                        {/* Tooltip */}
                        {isHov && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg shadow-2xl border text-xs p-2 animate-fade-in pointer-events-none"
                            style={{ background: 'var(--color-surface)', borderColor: colors.border }}>
                            <div className="font-bold mb-1" style={{ color: colors.text }}>
                              {mi} ↔ {mj} : {code}
                            </div>
                            <div className="text-[var(--color-text-muted)]">{REL_MEANINGS[code]}</div>
                            {flow > 0 && <div className="mt-1 text-[var(--color-primary-light)]">Flow: {flow} units</div>}
                            {reason && reason !== 'flow' && <div className="mt-0.5 text-[var(--color-accent)]">Reason: {reason}</div>}
                            {reason === 'flow' && <div className="mt-0.5 text-[var(--color-success)] text-[10px]">Derived from production flow</div>}
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

      {/* Score summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {machines
          .slice()
          .sort((a, b) => (slpResult.scores[b] || 0) - (slpResult.scores[a] || 0))
          .map((m, rank) => {
            const isDirector = m === slpResult.director_machine;
            return (
              <div key={m} className="rounded-lg border p-3 flex flex-col gap-1"
                style={{
                  borderColor: isDirector ? '#a855f7' : 'var(--color-surface-lighter)',
                  background: isDirector ? 'rgba(168,85,247,0.08)' : 'var(--color-surface-light)',
                }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--color-text-muted)]">#{rank + 1}</span>
                  <span className="font-bold text-sm" style={{ color: isDirector ? '#c084fc' : 'var(--color-text)' }}>{m}</span>
                  {isDirector && <span className="ml-auto text-[10px] font-bold px-1 py-0.5 rounded bg-purple-600/30 text-purple-300">Director</span>}
                </div>
                <div className="text-lg font-black" style={{ color: isDirector ? '#a855f7' : 'var(--color-primary-light)' }}>
                  {slpResult.scores[m] ?? 0}
                  <span className="text-[10px] text-[var(--color-text-muted)] font-normal ml-1">REL score</span>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
