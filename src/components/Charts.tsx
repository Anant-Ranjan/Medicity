"use client";
// Pure SVG chart components — no external lib needed

export function BarChart({ data, color = '#6366f1', height = 160 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={height + 40} viewBox={`0 0 ${Math.max(data.length * 60, 300)} ${height + 40}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d.value / max) * height;
          const x = i * 60 + 10;
          return (
            <g key={i}>
              <rect x={x} y={height - barH} width={40} height={barH} rx={4} fill={color} opacity={0.8} />
              <title>{d.label}: {d.value}</title>
              <text x={x + 20} y={height + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label.slice(0, 8)}</text>
              <text x={x + 20} y={height - barH - 4} textAnchor="middle" fontSize={9} fill="#e2e8f0" fontWeight="bold">{d.value}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -90;
  const r = 60; const cx = 90; const cy = 80;
  const slices = data.map(d => {
    const pct = d.value / total;
    const a = pct * 360;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + a) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad); const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);   const y2 = cy + r * Math.sin(endRad);
    const large = a > 180 ? 1 : 0;
    const mid = angle + a / 2;
    const midRad = (mid * Math.PI) / 180;
    const lx = cx + (r + 18) * Math.cos(midRad); const ly = cy + (r + 18) * Math.sin(midRad);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle += a;
    return { ...d, path, pct, lx, ly };
  });

  return (
    <svg width="180" height="160">
      <circle cx={cx} cy={cy} r={r + 1} fill="transparent" stroke="#1e293b" strokeWidth={2} />
      {slices.map((s, i) => (
        <g key={i}><path d={s.path} fill={s.color} opacity={0.9}><title>{s.label}: {s.value} ({(s.pct * 100).toFixed(1)}%)</title></path></g>
      ))}
      <circle cx={cx} cy={cy} r={38} fill="hsl(var(--card))" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#e2e8f0" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={8} fill="#64748b">total</text>
    </svg>
  );
}

export function LineChart({ data, color = '#6366f1', height = 120 }: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 300; const pad = 20;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - d.value / max) * (height - pad * 2),
    ...d,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M ${pts[0]?.x} ${height} ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${pts[pts.length - 1]?.x} ${height} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={height + 20} viewBox={`0 0 ${w} ${height + 20}`}>
        <defs>
          <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#lg-${color.replace('#','')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <title>{p.label}: {p.value}</title>
          </g>
        ))}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={height + 14} textAnchor="middle" fontSize={8} fill="#64748b">{p.label.slice(0, 6)}</text>
        ))}
      </svg>
    </div>
  );
}

export function StackedBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let left = 0;
  return (
    <div className="w-full">
      <div className="flex h-5 rounded-full overflow-hidden w-full gap-0.5">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100;
          const el = <div key={i} style={{ width: `${pct}%`, background: item.color }} title={`${item.label}: ${item.value}`} className="transition-all" />;
          left += pct;
          return el;
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
            {item.label} ({item.value})
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatGrid({ cells }: { cells: { x: number; y: number; intensity: number; label: string }[] }) {
  const max = Math.max(...cells.map(c => c.intensity), 1);
  return (
    <svg width="100%" height="200" viewBox="0 0 400 200">
      {/* Grid background */}
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 16 }).map((_, col) => (
          <rect key={`${row}-${col}`} x={col * 25} y={row * 25} width={24} height={24} rx={2} fill="#0f172a" opacity={0.4} />
        ))
      )}
      {/* Intensity blobs */}
      {cells.map((c, i) => {
        const alpha = 0.15 + (c.intensity / max) * 0.75;
        const radius = 20 + (c.intensity / max) * 40;
        const color = c.intensity / max > 0.7 ? '#ef4444' : c.intensity / max > 0.4 ? '#f59e0b' : '#22c55e';
        return (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={radius} fill={color} opacity={alpha * 0.4} style={{ filter: 'blur(8px)' }} />
            <circle cx={c.x} cy={c.y} r={6} fill={color} opacity={0.9}>
              <title>{c.label}: {c.intensity} cases</title>
            </circle>
            <circle cx={c.x} cy={c.y} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5}>
              <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
      {/* Legend */}
      {[['Low', '#22c55e'], ['Medium', '#f59e0b'], ['High', '#ef4444']].map(([l, c], i) => (
        <g key={i} transform={`translate(${310 + i * 0}, ${160 + i * 14})`}>
          <circle cx={4} cy={4} r={4} fill={c as string} />
          <text x={12} y={8} fontSize={9} fill="#94a3b8">{l}</text>
        </g>
      ))}
    </svg>
  );
}
