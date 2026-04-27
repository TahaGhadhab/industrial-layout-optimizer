import React from 'react';

export default function HelpPage() {
  return (
    <div className="animate-fade-in p-6 bg-[var(--color-surface)] min-h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-white border-b border-[var(--color-surface-lighter)] pb-4">
        User Guide & Help
      </h2>

      <div className="space-y-8 text-[var(--color-text-muted)] leading-relaxed">
        {/* SECTION 1: Overview */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-primary-light)] mb-3 flex items-center gap-2">
            <span>📖</span> Section 1: Overview
          </h3>
          <p className="mb-3">
            The <strong>Machine Layout Solver</strong> is a tool designed for industrial engineering to optimize the arrangement of machines on a factory floor.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>King's Method</strong> focuses on <em>Cellular Manufacturing</em>, grouping machines and parts into independent manufacturing cells (Cell Formation).
            </li>
            <li>
              <strong>Chaining Methods (Flow & Links)</strong> focus on physical layout optimization by reducing crossings, minimizing distance, and determining the optimal sequence of machines on a straight line.
            </li>
          </ul>
        </section>

        {/* SECTION 2: How to Use */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-accent)] mb-3 flex items-center gap-2">
            <span>⚙️</span> Section 2: How to Use
          </h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Enter Matrix (King):</strong> Define the Machine-Part incidence matrix. A 1 means the machine processes that part.</li>
            <li><strong>Enter Routing:</strong> For chaining, enter the sequence of machines each part visits.</li>
            <li><strong>Enter Volume (Optional):</strong> Provide the production volume for each part (required for Flow Layout).</li>
            <li><strong>Run Methods:</strong> Use the buttons on the left sidebar to execute the algorithms step by step.</li>
            <li><strong>Analyze Results:</strong> Explore the tabs to view matrices, crossings, and the physical layout graphs.</li>
          </ol>
        </section>

        {/* SECTION 3: Input Format */}
        <section>
          <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span>📝</span> Section 3: Input Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface-light)] p-4 rounded-lg border border-[var(--color-surface-lighter)]">
              <h4 className="font-semibold text-white mb-2">Routing Example:</h4>
              <code className="text-sm text-pink-400">P1: M1 -&gt; M2 -&gt; M3</code>
              <p className="text-xs mt-2">Part 1 is processed sequentially on machines M1, M2, and then M3.</p>
            </div>
            <div className="bg-[var(--color-surface-light)] p-4 rounded-lg border border-[var(--color-surface-lighter)]">
              <h4 className="font-semibold text-white mb-2">Volume Example:</h4>
              <code className="text-sm text-pink-400">P1: 10</code>
              <p className="text-xs mt-2">Part 1 has a production volume/batch size of 10 units.</p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Interpretation */}
        <section>
          <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <span>🔍</span> Section 4: Interpretation
          </h3>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="w-4 h-4 mt-1 rounded-full bg-[var(--color-accent)] flex-shrink-0"></span>
              <div>
                <strong>Director Machine:</strong> The central or starting point of the layout, usually the machine with the highest total traffic or connectivity.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-4 h-4 mt-1 bg-green-500 rounded flex-shrink-0" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></span>
              <div>
                <strong>Flow Arrows & Edge Thickness:</strong> Indicates the direction of part movement. Thicker edges represent higher traffic volumes between machines.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-4 border-t-2 border-dashed border-red-500 mt-2 flex-shrink-0"></span>
              <div>
                <strong>Off-Tram Flows:</strong> (Red dashed lines) These are flows that skip adjacent machines and travel longer distances, reducing efficiency.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-lg leading-none mt-1">📊</span>
              <div>
                <strong>Optimality Ratio (Ro):</strong> A metric measuring layout quality. A value closer to 1 means fewer crossings and shorter material handling distances.
              </div>
            </li>
          </ul>
        </section>

        {/* SECTION 5: Tips */}
        <section>
          <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <span>💡</span> Section 5: Tips
          </h3>
          <div className="bg-[rgba(250,204,21,0.1)] border border-yellow-500/30 p-4 rounded-lg">
            <ul className="list-disc pl-5 space-y-2 text-yellow-200/80">
              <li><strong>Avoid Inconsistent Routing:</strong> Ensure your routing paths match the machines defined in your matrix.</li>
              <li><strong>Use Realistic Volumes:</strong> Large variances in part volumes will significantly alter the final flow-based layout.</li>
              <li><strong>Compare Methods:</strong> Try both the Flow-based chaining (which weighs volume) and Link-based chaining (which ignores volume) to find the most balanced arrangement.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
