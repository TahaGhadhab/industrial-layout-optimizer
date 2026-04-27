/** ConnectivityGraphView — Physical layout graph for connectivity mode.
 * Similar to GraphView but with uniform edge weights (all links equal thickness)
 * and undirected edges (no arrows).
 */
import { useMemo, useState } from 'react';
import { useStore } from '../store';

export default function ConnectivityGraphView() {
  const { connectivityResult } = useStore();
  const res = connectivityResult;

  const [hoverNode, setHoverNode] = useState<string | null>(null);

  if (!res) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)]">
        <div className="text-4xl animate-bounce">🕸️</div>
        <p>No layout generated. Run the connectivity analysis first.</p>
      </div>
    );
  }

  const { layout, links, off_tram_links, machine_labels, director_machine, connectivity } = res;

  const { nodes, edges, minX, maxX, minY, maxY } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    const nodes = (layout || []).map((coord: any) => {
      if (coord.x < minX) minX = coord.x;
      if (coord.x > maxX) maxX = coord.x;
      if (coord.y < minY) minY = coord.y;
      if (coord.y > maxY) maxY = coord.y;
      return { id: coord.machine, index: coord.index, x: coord.x, y: coord.y, isDirector: coord.machine === director_machine };
    });

    if (nodes.length === 0) {
      machine_labels.forEach((m: string, i: number) => {
        nodes.push({ id: m, index: i, x: i, y: 0, isDirector: m === director_machine });
      });
      minX = 0; maxX = machine_labels.length; minY = -1; maxY = 1;
    } else {
      if (minX === Infinity) { minX = -1; maxX = 1; minY = -1; maxY = 1; }
      if (minX === maxX) { minX -= 1; maxX += 1; }
      if (minY === maxY) { minY -= 1; maxY += 1; }
    }

    const offTramSet = new Set(
      (off_tram_links || []).map((l: any) => `${l.from}-${l.to}`)
    );

    const edges = (links || []).map((link: any) => {
      const source = nodes.find((n: any) => n.id === link.from);
      const target = nodes.find((n: any) => n.id === link.to);
      const isOffTram = offTramSet.has(`${link.from}-${link.to}`) || offTramSet.has(`${link.to}-${link.from}`);
      return { source, target, isOffTram, id: `${link.from}-${link.to}`, distance: link.distance };
    }).filter((e: any) => e.source && e.target);

    return { nodes, edges, minX, maxX, minY, maxY };
  }, [layout, links, off_tram_links, machine_labels, director_machine]);

  const padding = 60;
  const width = 800;
  const height = 500;

  const scaleX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const scaleY = (y: number) => padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding);

  return (
    <div className="animate-fade-in flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Connectivity Layout Map (x, y)
        </h3>
        <div className="flex items-center gap-4 text-xs bg-[var(--color-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-surface-lighter)] shadow-sm">
          <span className="font-semibold text-white mr-1">Legend:</span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> 
            Director
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="flex items-center w-6 relative">
              <span className="block w-full h-[1.5px] bg-purple-400 opacity-70" />
              <div className="absolute right-0 -top-[3px] border-y-[4px] border-l-[5px] border-y-transparent border-l-purple-400 opacity-70" />
            </span> 
            Direction
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="block w-6 border-t-2 border-dashed border-[var(--color-danger)] opacity-80" /> 
            Off-Tram
          </span>
        </div>
      </div>

      <div className="flex-1 bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-surface-lighter)] overflow-hidden relative" style={{ minHeight: '500px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' }}>
          <defs>
            <radialGradient id="bgGlowConn" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(30, 41, 59, 0.8)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="glowConn">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Arrow Markers */}
            <marker id="arrow-conn-normal" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(168, 85, 247, 0.6)" />
            </marker>
            <marker id="arrow-conn-hover" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
            </marker>
            <marker id="arrow-conn-offtram" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(239, 68, 68, 0.8)" />
            </marker>
            <marker id="arrow-conn-offtram-hover" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-danger)" />
            </marker>
          </defs>

          {/* Background grid */}
          <g className="opacity-10 pointer-events-none">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={width * i / 10} y1="0" x2={width * i / 10} y2={height} stroke="#fff" strokeWidth="1" />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={height * i / 10} x2={width} y2={height * i / 10} stroke="#fff" strokeWidth="1" />
            ))}
          </g>

          {/* Edges */}
          {edges.map((edge: any, i: number) => {
            const isHovered = hoverNode === edge.source.id || hoverNode === edge.target.id;
            const opacity = hoverNode ? (isHovered ? 0.9 : 0.1) : 0.6;
            const thickness = 3; // uniform — no flow weighting

            let color = 'rgba(168, 85, 247, 0.6)';
            let hoverColor = '#a855f7';
            let marker = 'url(#arrow-conn-normal)';

            if (edge.isOffTram) {
              color = 'rgba(239, 68, 68, 0.6)';
              hoverColor = 'var(--color-danger)';
              marker = isHovered ? 'url(#arrow-conn-offtram-hover)' : 'url(#arrow-conn-offtram)';
            } else if (isHovered) {
              marker = 'url(#arrow-conn-hover)';
            }

            return (
              <g key={edge.id || i}>
                <line
                  x1={scaleX(edge.source.x)}
                  y1={scaleY(edge.source.y)}
                  x2={scaleX(edge.target.x)}
                  y2={scaleY(edge.target.y)}
                  stroke={isHovered ? hoverColor : color}
                  strokeWidth={thickness}
                  strokeOpacity={opacity}
                  strokeDasharray={edge.isOffTram ? "6,4" : "none"}
                  markerEnd={marker}
                  className="transition-all duration-300"
                />
                <title>
                  {`From: ${edge.source.id} → To: ${edge.target.id}\nDistance: ${edge.distance}\nStatus: ${edge.isOffTram ? 'OFF-TRAM (Red)' : 'NORMAL (Purple)'}`}
                </title>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHovered = hoverNode === node.id;
            const px = scaleX(node.x);
            const py = scaleY(node.y);
            const isDirector = node.isDirector;

            return (
              <g
                key={node.id}
                transform={`translate(${px}, ${py})`}
                onMouseEnter={() => setHoverNode(node.id)}
                onMouseLeave={() => setHoverNode(null)}
                className="cursor-pointer transition-transform duration-300 hover:scale-110 group"
              >
                {/* Director glow */}
                {isDirector && (
                  <circle r="35" fill="#a855f7" fillOpacity="0.2" filter="url(#glowConn)" className="animate-pulse" />
                )}

                {/* Main node */}
                <rect
                  x="-20" y="-20"
                  width="40" height="40"
                  rx="8"
                  fill={isDirector ? "url(#directorGradient)" : (isHovered ? "#7c3aed" : "var(--color-surface)")}
                  stroke={isDirector ? "#fff" : "var(--color-surface-lighter)"}
                  strokeWidth={isDirector ? 3 : (isHovered ? 2 : 1.5)}
                  className="transition-colors duration-200"
                />

                {/* Label */}
                <text
                  textAnchor="middle"
                  dy="5"
                  fill={isDirector ? "#fff" : "#fff"}
                  fontSize="14"
                  fontWeight="bold"
                  className="pointer-events-none select-none drop-shadow-md"
                >
                  {node.id}
                </text>

                {/* Coordinate on hover */}
                <text
                  textAnchor="middle"
                  y="32"
                  fill="var(--color-text-muted)"
                  fontSize="10"
                  className="pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ({node.x}, {node.y})
                </text>

                {/* Connectivity badge on hover */}
                {connectivity[node.index] !== undefined && (
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity transform -translate-y-8">
                    <rect x="-30" y="-14" width="60" height="18" rx="4" fill="var(--color-surface-lighter)" />
                    <text textAnchor="middle" dy="-2" fontSize="9" fill="#fff" fontWeight="bold">
                      {connectivity[node.index]} Links
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Director gradient definition */}
          <defs>
            <linearGradient id="directorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
