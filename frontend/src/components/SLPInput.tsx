/**
 * SLPInput — Dedicated input panel for the SLP Method.
 * Provides: routing text, volumes text, qualitative REL table, space table, run button.
 */
import React, { useState } from 'react';
import { useStore } from '../store';
import type { RelCode, QualitativeRelEntry } from '../types';

const REL_CODES: RelCode[] = ['A', 'E', 'I', 'O', 'U', 'X'];

const REL_COLORS: Record<RelCode, string> = {
  A: '#FF4444',
  E: '#FF8C00',
  I: '#FFD700',
  O: '#32CD32',
  U: '#94a3b8',
  X: '#8B0000',
};

const REL_MEANINGS: Record<RelCode, string> = {
  A: 'Absolutely Necessary',
  E: 'Essential',
  I: 'Important',
  O: 'Ordinary',
  U: 'Unimportant',
  X: 'Undesirable',
};

export default function SLPInput() {
  const {
    slpRoutingText, setSlpRoutingText,
    slpVolumeText, setSlpVolumeText,
    slpQualRel, setSlpQualRel,
    slpSpaceText, setSlpSpaceText,
    slpAvailableSpace, setSlpAvailableSpace,
    runSLP, loading, error,
  } = useStore();

  const [showVolumes, setShowVolumes] = useState(true);
  const [showQualRel, setShowQualRel] = useState(false);
  const [showSpaces, setShowSpaces] = useState(false);

  const addRelRow = () => {
    setSlpQualRel([...slpQualRel, { from: '', to: '', code: 'U', reason: '' }]);
    setShowQualRel(true);
  };

  const updateRelRow = (idx: number, field: keyof QualitativeRelEntry, value: string) => {
    const updated = slpQualRel.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    );
    setSlpQualRel(updated);
  };

  const removeRelRow = (idx: number) => {
    setSlpQualRel(slpQualRel.filter((_, i) => i !== idx));
  };

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Step 1: Routings ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--color-surface-light)] flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
          <span className="text-sm font-semibold text-white">Routing Sequences</span>
          <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">Required</span>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
            One part per line: <code className="text-purple-400">P1: M1 → M2 → M3</code>
          </p>
          <textarea
            value={slpRoutingText}
            onChange={(e) => setSlpRoutingText(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={"P1: M1 -> M2 -> M3\nP2: M1 -> M3 -> M4\nP3: M2 -> M4"}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs font-mono resize-none focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Step 2: Volumes ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <button
          onClick={() => setShowVolumes(!showVolumes)}
          className="w-full px-4 py-3 bg-[var(--color-surface-light)] flex items-center gap-2 hover:bg-[rgba(168,85,247,0.08)] transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-[var(--color-surface-lighter)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
          <span className="text-sm font-semibold text-white">Production Volumes</span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-1">(optional)</span>
          <span className="ml-auto text-[var(--color-text-muted)] text-xs">{showVolumes ? '▲' : '▼'}</span>
        </button>
        {showVolumes && (
          <div className="p-3 animate-fade-in">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
              One part per line: <code className="text-purple-400">P1: 150</code>
            </p>
            <textarea
              value={slpVolumeText}
              onChange={(e) => setSlpVolumeText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={"P1: 150\nP2: 200\nP3: 100"}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs font-mono resize-none focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* ── Step 3: Qualitative REL ─────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <button
          onClick={() => setShowQualRel(!showQualRel)}
          className="w-full px-4 py-3 bg-[var(--color-surface-light)] flex items-center gap-2 hover:bg-[rgba(168,85,247,0.08)] transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-[var(--color-surface-lighter)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
          <span className="text-sm font-semibold text-white">Qualitative Relationships</span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-1">(optional)</span>
          {slpQualRel.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold">{slpQualRel.length}</span>
          )}
          <span className="ml-auto text-[var(--color-text-muted)] text-xs">{showQualRel ? '▲' : '▼'}</span>
        </button>
        {showQualRel && (
          <div className="p-3 animate-fade-in space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Override or add qualitative proximity constraints (noise, shared equipment…)
              </p>
            </div>
            {/* REL Legend */}
            <div className="flex flex-wrap gap-1 mb-2">
              {REL_CODES.map(code => (
                <span key={code} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                  style={{ borderColor: REL_COLORS[code], color: REL_COLORS[code], background: REL_COLORS[code] + '18' }}>
                  {code} — {REL_MEANINGS[code]}
                </span>
              ))}
            </div>
            {slpQualRel.length > 0 && (
              <div className="rounded-lg overflow-hidden border border-[var(--color-surface-lighter)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--color-surface-light)]">
                      <th className="px-2 py-1.5 text-left text-[var(--color-text-muted)] font-medium w-[22%]">Machine A</th>
                      <th className="px-2 py-1.5 text-left text-[var(--color-text-muted)] font-medium w-[22%]">Machine B</th>
                      <th className="px-2 py-1.5 text-left text-[var(--color-text-muted)] font-medium w-[16%]">Code</th>
                      <th className="px-2 py-1.5 text-left text-[var(--color-text-muted)] font-medium">Reason</th>
                      <th className="px-2 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slpQualRel.map((row, idx) => (
                      <tr key={idx} className="border-t border-[var(--color-surface-lighter)] hover:bg-[var(--color-surface-light)]">
                        <td className="px-1 py-1">
                          <input
                            value={row.from}
                            onChange={e => updateRelRow(idx, 'from', e.target.value)}
                            placeholder="M1"
                            className="w-full px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs uppercase font-mono focus:outline-none focus:border-purple-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={row.to}
                            onChange={e => updateRelRow(idx, 'to', e.target.value)}
                            placeholder="M2"
                            className="w-full px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs uppercase font-mono focus:outline-none focus:border-purple-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={row.code}
                            onChange={e => updateRelRow(idx, 'code', e.target.value)}
                            className="w-full px-2 py-1 rounded border text-xs font-bold focus:outline-none cursor-pointer"
                            style={{
                              background: REL_COLORS[row.code] + '22',
                              borderColor: REL_COLORS[row.code],
                              color: REL_COLORS[row.code],
                            }}
                          >
                            {REL_CODES.map(c => (
                              <option key={c} value={c} style={{ background: '#1e293b', color: REL_COLORS[c] }}>
                                {c} — {REL_MEANINGS[c]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={row.reason}
                            onChange={e => updateRelRow(idx, 'reason', e.target.value)}
                            placeholder="e.g. noise, shared equipment…"
                            className="w-full px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs focus:outline-none focus:border-purple-500"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => removeRelRow(idx)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400 transition-colors text-xs"
                            title="Remove row"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              onClick={addRelRow}
              className="w-full py-1.5 rounded-lg border border-dashed border-purple-500/50 text-purple-400 text-xs font-medium hover:bg-purple-500/10 transition-colors"
            >
              + Add Relationship
            </button>
          </div>
        )}
      </div>

      {/* ── Step 4: Space Requirements ──────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden">
        <button
          onClick={() => setShowSpaces(!showSpaces)}
          className="w-full px-4 py-3 bg-[var(--color-surface-light)] flex items-center gap-2 hover:bg-[rgba(168,85,247,0.08)] transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-[var(--color-surface-lighter)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
          <span className="text-sm font-semibold text-white">Space Requirements</span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-1">(optional)</span>
          <span className="ml-auto text-[var(--color-text-muted)] text-xs">{showSpaces ? '▲' : '▼'}</span>
        </button>
        {showSpaces && (
          <div className="p-3 animate-fade-in space-y-2">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
              Machine footprint in m²: <code className="text-purple-400">M1: 20</code>
            </p>
            <textarea
              value={slpSpaceText}
              onChange={(e) => setSlpSpaceText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={"M1: 20\nM2: 15\nM3: 25\nM4: 10"}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs font-mono resize-none focus:outline-none focus:border-purple-500 transition-colors"
            />
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="whitespace-nowrap">Total available space (m²):</span>
              <input
                type="number"
                min="0"
                value={slpAvailableSpace}
                onChange={e => setSlpAvailableSpace(e.target.value)}
                placeholder="e.g. 200"
                className="flex-1 px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-surface-lighter)] text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* ── Run Button ──────────────────────────────────────────── */}
      <button
        onClick={runSLP}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}
      >
        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Computing SLP…
          </span>
        ) : (
          '🗺️ Run SLP Analysis'
        )}
      </button>
    </div>
  );
}
