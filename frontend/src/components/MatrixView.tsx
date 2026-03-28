/** MatrixView — Original vs reordered matrix with cluster highlights. */
import { useStore } from '../store';

const CELL_COLORS = [
  'rgba(99,102,241,0.25)',   // indigo
  'rgba(16,185,129,0.25)',   // emerald
  'rgba(245,158,11,0.25)',   // amber
  'rgba(239,68,68,0.25)',    // red
  'rgba(168,85,247,0.25)',   // purple
  'rgba(6,182,212,0.25)',    // cyan
];

function getCellColor(cellId: number) {
  return CELL_COLORS[(cellId - 1) % CELL_COLORS.length];
}

function MatrixTable({ title, matrix, rowLabels, colLabels, cells }: {
  title: string;
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  cells?: { machines: string[]; parts: string[]; id: number }[];
}) {
  // Build cell membership map for highlighting
  const machineCellMap: Record<string, number> = {};
  const partCellMap: Record<string, number> = {};
  if (cells) {
    for (const cell of cells) {
      for (const m of cell.machines) machineCellMap[m] = cell.id;
      for (const p of cell.parts) partCellMap[p] = cell.id;
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">{title}</h3>
      <div className="overflow-auto rounded-lg border border-[var(--color-surface-lighter)]">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 px-2 py-1.5 bg-[var(--color-surface-light)] text-[var(--color-text-muted)]" />
              {colLabels.map((l, j) => (
                <th key={j} className="sticky top-0 z-10 px-2 py-1.5 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-primary-light)] whitespace-nowrap">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="sticky left-0 z-10 px-2 py-1.5 bg-[var(--color-surface-light)] text-xs font-semibold text-[var(--color-accent)] whitespace-nowrap">
                  {rowLabels[i]}
                </td>
                {row.map((val, j) => {
                  const mCell = machineCellMap[rowLabels[i]];
                  const pCell = partCellMap[colLabels[j]];
                  const inSameCell = mCell && pCell && mCell === pCell;
                  const isExceptional = val === 1 && mCell && pCell && mCell !== pCell;
                  return (
                    <td key={j}
                      className="px-2 py-1.5 text-center border border-[var(--color-surface-lighter)] text-xs font-mono transition-colors"
                      style={{
                        backgroundColor: inSameCell ? getCellColor(mCell) : 'transparent',
                        color: val === 1 ? (isExceptional ? '#ef4444' : '#fff') : 'var(--color-text-muted)',
                        fontWeight: val === 1 ? 700 : 400,
                      }}
                    >
                      {val}
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

export default function MatrixView() {
  const { matrix, machineLabels, partLabels, kingResult } = useStore();

  return (
    <div className="animate-fade-in flex flex-col gap-6 lg:flex-row">
      <MatrixTable title="Original Matrix" matrix={matrix} rowLabels={machineLabels} colLabels={partLabels} />
      {kingResult && (
        <MatrixTable
          title="Reordered (King's Method)"
          matrix={kingResult.reordered_matrix}
          rowLabels={kingResult.reordered_machine_labels}
          colLabels={kingResult.reordered_part_labels}
          cells={kingResult.cells}
        />
      )}
    </div>
  );
}
