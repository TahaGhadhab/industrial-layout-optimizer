/**
 * SLPRelGraph — Activity Relationship Diagram (Step 3).
 * SVG force-layout approximation using REL chart values as edge weights.
 * Nodes = machines, edges colored by REL code, X = dashed dark line.
 */
import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { RelCode } from '../types';

const REL_COLOR: Record<RelCode, string> = {
  A: '#FF4444',
  E: '#FF8C00',
  I: '#FFD700',
  O: '#32CD32',
  U: 'transparent',
  X: '#8B0000',
};
const REL_WIDTH: Record<RelCode, number> = { A: 5, E: 4, I: 3, O: 2, U: 0, X: 2 };
const REL_MEANINGS: Record<RelCode, string> = {
  A: 'Absolutely Necessary',
  E: 'Essential',
  I: 'Important',
  O: 'Ordinary',
  U: 'Unimportant',
  X: 'Undesirable',
};

// Arrange machines in a circle, director at center if many machines, else radial
function circlePositions(machines: string[], cx: number, cy: number, r: number): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  machines.forEach((m, i) => {
    const angle = (2 * Math.PI * i) / machines.length - Math.PI / 2;
    pos[m] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return pos;
}

export default function SLPRelGraph() {
  const { slpResult } = useStore();
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  if (!slpResult) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl">🕸️</div>
        <p>Run SLP Analysis to see the Activity Relationship Diagram</p>
      </div>
    );
  }

  const { machines, rel_chart, rel_numeric, rel_reasons, scores, director_machine } = slpResult;

  const W = 800, H = 520;
  const cx = W / 2, cy = H / 2;
  const r = Math.min(cx, cy) - 80;

  const positions = useMemo(() => circlePositions(machines, cx, cy, r), [machines]);

  // Build edge list (upper triangle only, skip U)
  const edges = useMemo(() => {
    const list: { mi: string; mj: string; code: RelCode; numeric: number; reason: string; id: string }[] = [];
    for (let i = 0; i < machines.length; i++) {
      for (let j = i + 1; j < machines.length; j++) {
        const mi = machines[i], mj = machines[j];
        const code = rel_chart[mi]?.[mj] as RelCode;
        if (!code || code === 'U') continue;
        list.push({ mi, mj, code, numeric: rel_numeric[mi]?.[mj] ?? 0, reason: rel_reasons[mi]?.[mj] ?? '', id: `${mi}-${mj}` });
      }
    }
    return list;
  }, [machines, rel_chart, rel_numeric, rel_reasons]);

  const maxScore = Math.max(...Object.values(scores), 1);

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Activity Relationship Diagram (Step 3)
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {(['A', 'E', 'I', 'O', 'X'] as RelCode[]).map(code => (
            <span key={code} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-bold"
              style={{ color: REL_COLOR[code], borderColor: REL_COLOR[code], background: REL_COLOR[code] + '15' }}>
              {code === 'X' && <span>- - -</span>}
              {code !== 'X' && <span>{'─'.repeat(REL_WIDTH[code] - 1)}</span>}
              {' '}{code}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden bg-[var(--color-surface-light)]" style={{ minHeight: 520 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ minHeight: 520 }}>
          <defs>
            <filter id="slpGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="slpBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(124,58,237,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#slpBg)" />

          {/* Grid lines subtle */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={H * i / 7} x2={W} y2={H * i / 7} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.03" />
          ))}

          {/* Edges */}
          {edges.map(edge => {
            const p1 = positions[edge.mi];
            const p2 = positions[edge.mj];
            if (!p1 || !p2) return null;
            const isHov = hoverEdge === edge.id || hoverNode === edge.mi || hoverNode === edge.mj;
            const color = REL_COLOR[edge.code];
            const width = REL_WIDTH[edge.code];
            const isDashed = edge.code === 'X';
            const opacity = hoverEdge || hoverNode ? (isHov ? 0.95 : 0.12) : 0.7;

            // Multiple parallel lines for A/E/I/O to show strength
            const lines = edge.code === 'X' ? 1 : (4 - ['O','I','E','A'].indexOf(edge.code));

            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len, ny = dx / len; // normal
            const spacing = 3;

            return (
              <g key={edge.id} onMouseEnter={() => setHoverEdge(edge.id)} onMouseLeave={() => setHoverEdge(null)}>
                {Array.from({ length: lines }).map((_, li) => {
                  const offset = (li - (lines - 1) / 2) * spacing;
                  const x1 = p1.x + nx * offset;
                  const y1 = p1.y + ny * offset;
                  const x2 = p2.x + nx * offset;
                  const y2 = p2.y + ny * offset;
                  return (
                    <line key={li}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={color} strokeWidth={isHov ? width + 1.5 : width}
                      strokeOpacity={opacity}
                      strokeDasharray={isDashed ? '8,5' : 'none'}
                      className="transition-all duration-200"
                    />
                  );
                })}
                {/* Invisible hit area */}
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="16" style={{ cursor: 'pointer' }} />
                {/* Hover tooltip */}
                {isHov && hoverEdge === edge.id && (
                  <foreignObject x={(p1.x + p2.x) / 2 - 80} y={(p1.y + p2.y) / 2 - 58} width="160" height="60">
                    <div style={{ background: 'var(--color-surface)', border: `1px solid ${color}`, borderRadius: 8, padding: '6px 8px', fontSize: 11, color, fontWeight: 700, lineHeight: 1.4 }}>
                      {edge.mi} ↔ {edge.mj}<br />
                      <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{REL_MEANINGS[edge.code]}</span>
                      {edge.reason && edge.reason !== 'flow' && <><br /><span style={{ color: '#fbbf24', fontWeight: 400 }}>{edge.reason}</span></>}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {machines.map(m => {
            const pos = positions[m];
            if (!pos) return null;
            const isDirector = m === director_machine;
            const isHov = hoverNode === m;
            const score = scores[m] ?? 0;
            const nodeR = 22 + (score / maxScore) * 12;

            return (
              <g key={m} transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoverNode(m)} onMouseLeave={() => setHoverNode(null)}
                className="cursor-pointer">
                {isDirector && (
                  <circle r={nodeR + 10} fill="rgba(168,85,247,0.15)" filter="url(#slpGlow)" className="animate-pulse" />
                )}
                <circle r={nodeR}
                  fill={isDirector ? '#7c3aed' : isHov ? '#4f46e5' : 'var(--color-surface)'}
                  stroke={isDirector ? '#c084fc' : isHov ? '#818cf8' : 'var(--color-surface-lighter)'}
                  strokeWidth={isDirector ? 2.5 : 2}
                  className="transition-all duration-200"
                  filter={isHov || isDirector ? 'url(#slpGlow)' : undefined}
                />
                <text textAnchor="middle" dy="5" fontSize={isDirector ? 13 : 12} fontWeight="bold"
                  fill={isDirector ? '#e9d5ff' : '#f1f5f9'} className="select-none pointer-events-none">
                  {m}
                </text>
                <text textAnchor="middle" y={nodeR + 14} fontSize="10" fill="var(--color-text-muted)" className="select-none pointer-events-none">
                  score: {score}
                </text>
                {isDirector && (
                  <text textAnchor="middle" y={-nodeR - 6} fontSize="10" fill="#c084fc" fontWeight="bold" className="select-none pointer-events-none">
                    ★ Director
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="text-[10px] text-[var(--color-text-muted)] flex flex-wrap gap-3 px-1">
        <span>📏 Node size = REL score</span>
        <span>🌐 Edge count = REL strength (A=4 lines, E=3, I=2, O=1)</span>
        <span>⚫ Dashed = X (undesirable)</span>
        <span>★ Director = highest REL score machine</span>
      </div>
    </div>
  );
}
