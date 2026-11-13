import { useEffect, useRef, useState } from 'react';
import { money } from './Layout';

// Weekly sales line chart (one series, so no legend: the card title names it).
// Hover / tap / arrow keys move a crosshair that snaps to the nearest week and shows a tooltip.
// "Table" switches to the same numbers as a table.

const LINE = '#ea580c'; // brand orange
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const weekRange = (start) => {
  const end = new Date(start + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return `${fmtDay(start)} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
};
// Short axis labels: 1.2k, 15k, 1.5L.
const short = (n) =>
  n >= 100000 ? `${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${Math.round(n)}`;

// Round axis max up to a 1 / 2 / 2.5 / 5 x 10^n step so gridlines land on clean values.
function niceMax(max, ticks = 4) {
  if (max <= 0) return ticks * 100;
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) * mag;
  return step * ticks;
}

export default function MonthlySalesChart({ data }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState(null); // hovered week index
  const [asTable, setAsTable] = useState(false);

  // Draw at the real pixel width so text stays crisp at any size.
  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [asTable]);

  const total = data.reduce((s, d) => s + Number(d.sales), 0);
  const header = (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div>
        <h3 className="font-semibold">Monthly sales</h3>
        <p className="text-xs text-gray-500">Last {data.length} days (Mon–Sun) · {money(total)} total</p>
      </div>
      <button onClick={() => setAsTable((v) => !v)}
        className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
        {asTable ? 'Chart' : 'Table'}
      </button>
    </div>
  );

  if (asTable) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        {header}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr><th className="py-1.5">Week</th><th className="py-1.5 text-right">Orders</th><th className="py-1.5 text-right">Sales</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.slice().reverse().map((d) => (
                <tr key={d.week}>
                  <td className="py-1.5">{weekRange(d.week)}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(d.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...data.map((d) => Number(d.sales))));
  const x = (i) => PAD.left + (data.length > 1 ? (i * innerW) / (data.length - 1) : innerW / 2);
  const y = (v) => PAD.top + innerH - (Number(v) / max) * innerH;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.sales).toFixed(1)}`).join('');
  const ticks = [0, 1, 2, 3, 4].map((n) => (max * n) / 4);
  // Thin out week labels when narrow (~56px each), always keeping the latest week.
  const every = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 56)));
  const showLabel = (i) => (data.length - 1 - i) % every === 0;

  // Snap the pointer to the nearest week.
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * width;
    const i = Math.round(((px - PAD.left) / innerW) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  };
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive((a) => {
      const cur = a ?? data.length - 1;
      return Math.min(data.length - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  const a = active != null ? data[active] : null;
  const last = data[data.length - 1];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {header}
      <div ref={wrap} className="relative">
        <svg width={width} height={H} role="img"
          aria-label={`Weekly sales line chart, last ${data.length} weeks. Latest week ${money(last?.sales || 0)}.`}
          tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)} className="block touch-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded">
          {/* Recessive grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#6b7280">₹{short(t)}</text>
            </g>
          ))}
          {/* Week labels */}
          {data.map((d, i) => showLabel(i) && (
            
            <text key={d.week} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">{fmtDay(d.day)}</text>
          ))}

          {/* Crosshair */}
          {a && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke="#9ca3af" strokeWidth="1" />}

          <path d={path} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* Markers ringed with the surface so they read on top of the line */}
          {data.map((d, i) => (
            <circle key={d.week} cx={x(i)} cy={y(d.sales)} r={i === active ? 5 : 4}
              fill={LINE} stroke="#fff" strokeWidth="2" />
          ))}
          {/* Direct label on the latest week only */}
          {last && active == null && (
            <text x={x(data.length - 1)} y={y(last.sales) - 10} textAnchor="end" fontSize="11" fontWeight="600" fill="#374151">
              {money(last.sales)}
            </text>
          )}
        </svg>

        {a && (
          <div className="pointer-events-none absolute top-1 z-10 rounded-md border bg-white px-3 py-2 text-xs shadow-lg whitespace-nowrap"
            style={x(active) > width / 2 ? { right: width - x(active) + 10 } : { left: x(active) + 10 }}>
            <div className="text-gray-500">{fmtDay(a.day)}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: LINE }} />
              <strong className="text-sm text-gray-900">{money(a.sales)}</strong>
              <span className="text-gray-500">sales</span>
            </div>
            <div className="text-gray-500 pl-5">{a.orders} order{a.orders === 1 ? '' : 's'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
