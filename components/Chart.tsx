'use client';
import { useState } from 'react';
import { inr, monthLabel } from '@/lib/format';

const niceStep = (raw: number) => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1)))); for (const k of [1, 2, 2.5, 5, 10]) if (raw <= k * p) return k * p; return 10 * p; };
const shortInr = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 ? 1 : 0)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `₹${v}`;
const barPath = (x: number, y: number, w: number, h: number) => { if (h <= 0) return ''; const r = Math.min(4, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };

export function InOutChart({ data }: { data: { m: string; inn: number; out: number }[] }) {
  const [tip, setTip] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.inn, d.out]));
  const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const W = 560, H = 220, L = 52, B = 26, T = 8, colW = (W - L) / data.length, bw = Math.min(22, colW / 3.2);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const ticks: number[] = []; for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v);
  return (
    <div>
      <div className="key"><span><i style={{ background: 'var(--c-in)' }} />Collected</span><span><i style={{ background: 'var(--c-out)' }} />Spent</span></div>
      <div className="chart" onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Money collected and spent per month">
          {ticks.map((v) => <g key={v}><line className="gridline" x1={L} x2={W} y1={y(v)} y2={y(v)} /><text className="axis" x={L - 8} y={y(v) + 4} textAnchor="end">{shortInr(v)}</text></g>)}
          {data.map((d, i) => {
            const cx = L + colW * i + colW / 2;
            return (
              <g key={d.m} onMouseEnter={() => setTip(i)} onClick={() => setTip(i)}>
                <path className="bar-in" d={barPath(cx - bw - 1, y(d.inn), bw, y(0) - y(d.inn))} />
                <path className="bar-out" d={barPath(cx + 1, y(d.out), bw, y(0) - y(d.out))} />
                <text className="axis" x={cx} y={H - 8} textAnchor="middle">{monthLabel(d.m).replace(' 20', " '")}</text>
                <rect className="hit" x={L + colW * i} y={0} width={colW} height={H} />
              </g>
            );
          })}
        </svg>
        {tip !== null && (
          <div className="chart-tip" style={{ left: `${((L + colW * tip + colW / 2) / W) * 100}%` }}>
            <b>{monthLabel(data[tip].m, true)}</b><br />Collected {inr(data[tip].inn)}<br />Spent {inr(data[tip].out)}
          </div>
        )}
      </div>
      <details className="small" style={{ marginTop: 8 }}>
        <summary>Show as a table</summary>
        <div className="table-wrap"><table><thead><tr><th>Month</th><th className="right">Collected</th><th className="right">Spent</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.m}><td>{monthLabel(d.m, true)}</td><td className="right num">{inr(d.inn)}</td><td className="right num">{inr(d.out)}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  );
}
