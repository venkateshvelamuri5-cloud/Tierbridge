'use client';

export type Block = { name: string; prefix?: string; floors: number; start: number; perFloor: number; plans: string[]; top?: { floor: number; count: number; plans: string[] } | null };
export type Layout = { plans: { name: string; area?: number }[]; blocks: Block[] };
export const BLANK_LAYOUT: Layout = { plans: [{ name: '2BHK', area: 1100 }], blocks: [{ name: 'Main', floors: 4, start: 1, perFloor: 2, plans: ['2BHK'] }] };

export function numbersFor(b: Block) {
  const out: string[] = [];
  for (let f = b.start; f < b.start + b.floors; f++) for (let i = 1; i <= b.perFloor; i++) out.push(`${b.prefix || ''}${f === 0 ? 'G' : f}${String(i).padStart(2, '0')}`);
  if (b.top) for (let i = 1; i <= b.top.count; i++) out.push(`${b.prefix || ''}${b.top.floor}${String(i).padStart(2, '0')}`);
  return out;
}
export const allNumbers = (l: Layout) => l.blocks.flatMap(numbersFor);
export const duplicates = (l: Layout) => { const a = allNumbers(l); return Array.from(new Set(a.filter((n, i) => a.indexOf(n) !== i))); };
export const flatCount = (l: Layout) => allNumbers(l).length;
export const clone = (l: Layout): Layout => JSON.parse(JSON.stringify(l));

/* Edits blocks, floors, flats per floor, numbering and plans. `simple` hides plans and penthouse options. */
export function LayoutEditor({ layout, onChange, simple = false }: { layout: Layout; onChange: (l: Layout) => void; simple?: boolean }) {
  const setBlock = (i: number, patch: Partial<Block>) => onChange({ ...layout, blocks: layout.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const planNames = layout.plans.map((p) => p.name);
  const dupes = duplicates(layout);
  const total = flatCount(layout);
  return (
    <div className="stack">
      {!simple && (
        <div>
          <h3>Flat plans</h3>
          {layout.plans.map((p, i) => (
            <div key={i} className="row" style={{ marginTop: 8 }}>
              <input aria-label="Plan name" type="text" value={p.name} onChange={(e) => onChange({ ...layout, plans: layout.plans.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} style={{ maxWidth: 220 }} />
              <input aria-label="Area in sq ft" type="number" value={p.area || ''} placeholder="sq ft" onChange={(e) => onChange({ ...layout, plans: layout.plans.map((x, j) => (j === i ? { ...x, area: Number(e.target.value) || undefined } : x)) })} style={{ maxWidth: 140 }} />
              {layout.plans.length > 1 && <button type="button" className="btn small danger" onClick={() => onChange({ ...layout, plans: layout.plans.filter((_, j) => j !== i) })}>Remove</button>}
            </div>
          ))}
          <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={() => onChange({ ...layout, plans: [...layout.plans, { name: '3BHK', area: 1450 }] })}>Add plan</button>
        </div>
      )}
      {layout.blocks.map((b, i) => (
        <div key={i} className="glass" style={{ padding: 16 }}>
          <div className="form-grid two">
            <label className="field"><span>Block name</span><input type="text" value={b.name} onChange={(e) => setBlock(i, { name: e.target.value })} /></label>
            <label className="field"><span>Flat number prefix</span><input type="text" value={b.prefix || ''} placeholder="e.g. A-" onChange={(e) => setBlock(i, { prefix: e.target.value })} /></label>
            <label className="field"><span>Floors with flats</span><input type="number" min={1} max={60} value={b.floors} onChange={(e) => setBlock(i, { floors: Math.min(60, Math.max(1, Number(e.target.value) || 1)) })} /></label>
            <label className="field"><span>Flats per floor</span><input type="number" min={1} max={20} value={b.perFloor} onChange={(e) => setBlock(i, { perFloor: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} /></label>
            <label className="field"><span>Lowest flat floor</span><select value={b.start} onChange={(e) => setBlock(i, { start: Number(e.target.value) })}><option value={0}>Ground (G01…)</option><option value={1}>1st (101…, parking below)</option></select></label>
            {!simple && <label className="field"><span>Plans, in order along each floor</span><input type="text" value={b.plans.join(', ')} onChange={(e) => setBlock(i, { plans: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /><small>From: {planNames.join(', ')}</small></label>}
            <label className="check full"><input type="checkbox" checked={!!b.top} onChange={(e) => setBlock(i, { top: e.target.checked ? { floor: b.start + b.floors, count: 2, plans: [planNames[planNames.length - 1]] } : null })} /> Penthouses on an extra top floor</label>
            {b.top && <label className="field"><span>Penthouses</span><input type="number" min={1} max={10} value={b.top.count} onChange={(e) => setBlock(i, { top: { ...b.top!, floor: b.start + b.floors, count: Math.max(1, Number(e.target.value) || 1) } })} /></label>}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>{numbersFor(b).length} flats: {numbersFor(b).slice(0, 8).join(', ')}{numbersFor(b).length > 8 ? ` … ${numbersFor(b).slice(-1)}` : ''}</p>
          {layout.blocks.length > 1 && <button type="button" className="btn small danger" onClick={() => onChange({ ...layout, blocks: layout.blocks.filter((_, j) => j !== i) })}>Remove block</button>}
        </div>
      ))}
      <div><button type="button" className="btn" onClick={() => onChange({ ...layout, blocks: [...layout.blocks, { name: `Block ${String.fromCharCode(65 + layout.blocks.length)}`, prefix: `${String.fromCharCode(65 + layout.blocks.length)}-`, floors: 5, start: 1, perFloor: 4, plans: [planNames[0]] }] })}>Add block</button></div>
      <p><b>{total} flats in total.</b>{dupes.length > 0 && <span className="err"> Some flat numbers repeat ({dupes.slice(0, 4).join(', ')}). Give each block its own prefix.</span>}</p>
    </div>
  );
}
