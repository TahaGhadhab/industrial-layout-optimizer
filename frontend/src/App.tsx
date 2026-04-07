/** Machine Layout Solver — Main App */
import { useStore, type Tab, type Mode } from './store';
import MatrixInput from './components/MatrixInput';
import MatrixView from './components/MatrixView';
import TriangularView from './components/TriangularView';
import GraphView from './components/GraphView';
import FlowView from './components/FlowView';
import FlowMatrixView from './components/FlowMatrixView';
import ResultsPanel from './components/ResultsPanel';
import StructureMatrixView from './components/StructureMatrixView';
import ConnectivityGraphView from './components/ConnectivityGraphView';
import { exportResults } from './api';
import { saveAs } from 'file-saver';

const TABS: Record<Mode, { id: Tab; label: string; icon: string }[]> = {
  king: [
    { id: 'matrix', label: 'Matrix', icon: '📊' },
    { id: 'results', label: 'Results', icon: '📋' },
  ],
  layout: [
    { id: 'flow_matrix', label: 'Flow Matrix', icon: '🔄' },
    { id: 'triangular', label: 'Triangular', icon: '🔺' },
    { id: 'graph', label: 'Layout (Graph)', icon: '🕸️' },
    { id: 'flow', label: 'Crossings', icon: '❌' },
    { id: 'results', label: 'Results', icon: '📋' },
  ],
  connectivity: [
    { id: 'structure_matrix', label: 'Structure Matrix', icon: '🔗' },
    { id: 'connectivity_graph', label: 'Layout (Graph)', icon: '🕸️' },
    { id: 'flow', label: 'Crossings', icon: '❌' },
    { id: 'results', label: 'Results', icon: '📋' },
  ],
};

function TabContent() {
  const activeTab = useStore((s) => s.activeTab);
  switch (activeTab) {
    case 'matrix': return <MatrixView />;
    case 'flow_matrix': return <FlowMatrixView />;
    case 'triangular': return <TriangularView />;
    case 'graph': return <GraphView />;
    case 'flow': return <FlowView />;
    case 'results': return <ResultsPanel />;
    case 'structure_matrix': return <StructureMatrixView />;
    case 'connectivity_graph': return <ConnectivityGraphView />;
    default: return null;
  }
}

export default function App() {
  const {
    mode, setMode,
    activeTab, setActiveTab, loading, error,
    runKing, runFlow, runLayout, runOptimize, runAnalyze,
    runConnectivity, runConnectivityOptimize,
    clearResults,
    matrix, machineLabels, partLabels, kingResult, flowResult, layoutResult,
    connectivityResult,
  } = useStore();

  const handleExport = async () => {
    try {
      const blob = await exportResults({
        matrix,
        machine_labels: machineLabels,
        part_labels: partLabels,
        king: kingResult,
        flow: flowResult,
        layout: layoutResult,
      });
      saveAs(blob, 'layout_solver_results.xlsx');
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const currentTabs = TABS[mode] || TABS.king;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-surface-lighter)]"
        style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-light) 100%)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
              ⚙️
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[var(--color-primary-light)] to-[var(--color-accent)] bg-clip-text text-transparent">
                Machine Layout Solver
              </h1>
              <p className="text-[10px] text-[var(--color-text-muted)] -mt-0.5">Cell Formation & Flow Layout Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="btn-sm bg-[var(--color-surface-lighter)] hover:bg-[var(--color-primary)] text-white text-xs">
              📤 Export Excel
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-screen-2xl mx-auto w-full">
        {/* Sidebar — Input & Actions */}
        <aside className="lg:w-[420px] xl:w-[460px] border-r border-[var(--color-surface-lighter)] bg-[var(--color-surface)] flex flex-col"
          style={{ maxHeight: 'calc(100vh - 56px)' }}>
          
          {/* Mode Toggle */}
          <div className="p-4 border-b border-[var(--color-surface-lighter)]">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
              Solver Mode
            </h2>
            <div className="flex p-1 bg-[var(--color-surface-light)] rounded-lg gap-1">
              <button 
                onClick={() => setMode('king')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'king' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                👑 King
              </button>
              <button 
                onClick={() => setMode('layout')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'layout' ? 'bg-[var(--color-accent)] text-gray-900 shadow-md' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                🔄 Chaining (Flow)
              </button>
              <button 
                onClick={() => setMode('connectivity')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'connectivity' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                🔗 Chaining (Links)
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3 flex items-center justify-between">
              Input Data
              {mode === 'layout' && <span className="text-[10px] font-normal text-[var(--color-accent)]">Includes Volume & Routing</span>}
              {mode === 'connectivity' && <span className="text-[10px] font-normal text-purple-400">Routing Only (No Volumes)</span>}
            </h2>
            
            <MatrixInput />

            {/* Action buttons */}
            <div className="mt-6 space-y-2">
              {mode === 'king' ? (
                <>
                  <button onClick={runKing} disabled={loading}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}>
                    {loading ? '⏳ Processing...' : '👑 Run King\'s Method'}
                  </button>
                  <button onClick={runAnalyze} disabled={loading}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm text-gray-900 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }}>
                    {loading ? '⏳ Processing...' : '🔬 Full Analysis'}
                  </button>
                </>
              ) : mode === 'layout' ? (
                <>
                  <button onClick={runFlow} disabled={loading}
                    className="w-full py-2 rounded-lg font-semibold text-sm text-gray-900 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #fef08a, #facc15)' }}>
                    {loading ? '⏳...' : '1. Calculate Flow & Traffic'}
                  </button>
                  <button onClick={runLayout} disabled={loading}
                    className="w-full py-2 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                    {loading ? '⏳...' : '2. Generate Initial Layout'}
                  </button>
                  <button onClick={runOptimize} disabled={loading}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)', boxShadow: '0 2px 12px rgba(2,132,199,0.3)' }}>
                    {loading ? '⏳ Processing...' : '🚀 3. Optimize Layout'}
                  </button>
                </>
              ) : (
                /* Connectivity mode */
                <>
                  <button onClick={runConnectivity} disabled={loading}
                    className="w-full py-2 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 2px 12px rgba(168,85,247,0.3)' }}>
                    {loading ? '⏳...' : '🔗 1. Build Structure & Layout'}
                  </button>
                  <button onClick={runConnectivityOptimize} disabled={loading}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                    {loading ? '⏳ Processing...' : '🚀 2. Optimize Layout'}
                  </button>
                </>
              )}

              {/* Clear button */}
              {(kingResult || flowResult || layoutResult || connectivityResult) && (
                <button onClick={clearResults}
                  className="w-full py-1.5 mt-2 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-light)] transition-colors">
                  🗑️ Clear Results
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[var(--color-danger)] text-sm text-[var(--color-danger)] animate-fade-in">
                ❌ {error}
              </div>
            )}
          </div>
        </aside>

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <nav className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-[var(--color-surface-lighter)] bg-[var(--color-surface)] overflow-x-auto hide-scrollbar">
            {currentTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-[var(--color-surface-light)] text-white border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)]'
                  }`}>
                <span className="mr-1.5">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 bg-[var(--color-surface)]" style={{ maxHeight: 'calc(100vh - 112px)' }}>
            <TabContent />
          </div>
        </div>
      </main>
    </div>
  );
}
