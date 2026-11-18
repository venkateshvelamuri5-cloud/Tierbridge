'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, friendly, must } from '@/lib/supabase';
import { slugify } from '@/lib/format';
import { useRun, useToast } from '@/components/ui';

type Block = { name: string; prefix?: string; floors: number; start: number; perFloor: number; plans: string[]; top?: { floor: number; count: number; plans: string[] } | null };
type Layout = { plans: { name: string; area?: number }[]; blocks: Block[] };

const BLANK: Layout = { plans: [{ name: '2BHK', area: 1100 }], blocks: [{ name: 'Main', floors: 4, start: 1, perFloor: 2, plans: ['2BHK'] }] };

function numbersFor(b: Block) {
  const out: string[] = [];
  for (let f = b.start; f < b.start + b.floors; f++) for (let i = 1; i <= b.perFloor; i++) out.push(`${b.prefix || ''}${f === 0 ? 'G' : f}${String(i).padStart(2, '0')}`);
  if (b.top) for (let i = 1; i <= b.top.count; i++) out.push(`${b.prefix || ''}${b.top.floor}${String(i).padStart(2, '0')}`);
  return out;
}

export default function NewSociety() {
  const router = useRouter();
  const toast = useToast();
  const { busy, run } = useRun();
  const [templates, setTemplates] = useState<any[]>([]);
  const [tpl, setTpl] = useState<string>('custom');
  const [layout, setLayout] = useState<Layout>(BLANK);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { db().from('templates').select('*').order('sort').then((r) => { try { setTemplates(must(r) as any[]); } catch (e) { toast(friendly(e), true); } }); }, [toast]);
  const pick = (t: any) => { setTpl(t ? t.id : 'custom'); setLayout(t ? JSON.parse(JSON.stringify(t.layout)) : BLANK); };
  const all = useMemo(() => layout.blocks.flatMap(numbersFor), [layout]);
  const dupes = all.filter((n, i) => all.indexOf(n) !== i);
  const setBlock = (i: number, patch: Partial<Block>) => setLayout({ ...layout, blocks: layout.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const planNames = layout.plans.map((p) => p.name);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const city = String(f.get('city') || '').trim(); const amount = Number(f.get('amount')) || null; const days = Number(f.get('days')) || 30;
    setErr('');
    if (!name.trim() || !city) { setErr('Enter the society’s name and city.'); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setErr('The web address can only use lowercase letters, numbers and single hyphens.'); return; }
    if (!all.length) { setErr('The layout has no flats.'); return; }
    if (dupes.length) { setErr(`Flat numbers repeat (${Array.from(new Set(dupes)).slice(0, 5).join(', ')}). Give blocks different prefixes.`); return; }
    await run(async () => {
      const id = must(await db().rpc('create_society', { p_name: name.trim(), p_slug: slug, p_city: city, p_template: tpl === 'custom' ? null : tpl, p_layout: layout, p_trial_days: days, p_amount: amount })) as string;
      const tName = String(f.get('save_as') || '').trim();
      if (tName) must(await db().from('templates').insert({ id: slugify(tName), name: tName, description: `${all.length} flats in ${layout.blocks.length} block${layout.blocks.length > 1 ? 's' : ''}`, layout, sort: 50 }));
      toast(`Created ${name.trim()}`); router.push(`/admin/s/${id}`);
    });
  }

  return (
    <>
      <div className="page-head"><div><h1>New society</h1><p className="muted">Pick the building template closest to the society, adjust it, then create it. The one-month free trial starts today.</p></div></div>
      <section className="panel">
        <h2>1. Building template</h2>
        <div className="tpl-grid" style={{ marginTop: 12 }}>
          {templates.map((t) => (
            <button key={t.id} type="button" className="tpl" aria-pressed={tpl === t.id} onClick={() => pick(t)}>
              <b>{t.name}</b><span className="small muted">{t.description}</span>
              <span className="small">{(t.layout.blocks as Block[]).reduce((a, b) => a + numbersFor(b).length, 0)} flats</span>
            </button>
          ))}
          <button type="button" className="tpl" aria-pressed={tpl === 'custom'} onClick={() => pick(null)}><b>Custom</b><span className="small muted">Start from a blank layout</span></button>
        </div>
      </section>

      <section className="panel">
        <h2>2. Adjust the layout</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          <div>
            <h3>Flat plans</h3>
            {layout.plans.map((p, i) => (
              <div key={i} className="row" style={{ marginTop: 8 }}>
                <input aria-label="Plan name" type="text" value={p.name} onChange={(e) => setLayout({ ...layout, plans: layout.plans.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} style={{ maxWidth: 220 }} />
                <input aria-label="Area in sq ft" type="number" value={p.area || ''} placeholder="sq ft" onChange={(e) => setLayout({ ...layout, plans: layout.plans.map((x, j) => (j === i ? { ...x, area: Number(e.target.value) || undefined } : x)) })} style={{ maxWidth: 140 }} />
                {layout.plans.length > 1 && <button type="button" className="btn small danger" onClick={() => setLayout({ ...layout, plans: layout.plans.filter((_, j) => j !== i) })}>Remove</button>}
              </div>
            ))}
            <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={() => setLayout({ ...layout, plans: [...layout.plans, { name: '3BHK', area: 1450 }] })}>Add plan</button>
          </div>
          {layout.blocks.map((b, i) => (
            <div key={i} className="glass" style={{ padding: 16 }}>
              <div className="form-grid two">
                <label className="field"><span>Block name</span><input type="text" value={b.name} onChange={(e) => setBlock(i, { name: e.target.value })} /></label>
                <label className="field"><span>Flat number prefix</span><input type="text" value={b.prefix || ''} placeholder="e.g. A-" onChange={(e) => setBlock(i, { prefix: e.target.value })} /></label>
                <label className="field"><span>Floors with flats</span><input type="number" min={1} max={60} value={b.floors} onChange={(e) => setBlock(i, { floors: Math.max(1, Number(e.target.value) || 1) })} /></label>
                <label className="field"><span>Flats per floor</span><input type="number" min={1} max={20} value={b.perFloor} onChange={(e) => setBlock(i, { perFloor: Math.max(1, Number(e.target.value) || 1) })} /></label>
                <label className="field"><span>Lowest flat floor</span><select value={b.start} onChange={(e) => setBlock(i, { start: Number(e.target.value) })}><option value={0}>Ground (G01…)</option><option value={1}>1st (101…, stilt parking below)</option></select></label>
                <label className="field"><span>Plans, in order along each floor</span><input type="text" value={b.plans.join(', ')} onChange={(e) => setBlock(i, { plans: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /><small>From: {planNames.join(', ')}</small></label>
                <label className="check full"><input type="checkbox" checked={!!b.top} onChange={(e) => setBlock(i, { top: e.target.checked ? { floor: b.start + b.floors, count: 2, plans: [planNames[planNames.length - 1]] } : null })} /> Penthouses on an extra top floor</label>
                {b.top && <label className="field"><span>Penthouses</span><input type="number" min={1} max={10} value={b.top.count} onChange={(e) => setBlock(i, { top: { ...b.top!, floor: b.start + b.floors, count: Math.max(1, Number(e.target.value) || 1) } })} /></label>}
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>{numbersFor(b).length} flats: {numbersFor(b).slice(0, 8).join(', ')}{numbersFor(b).length > 8 ? ` … ${numbersFor(b).slice(-1)}` : ''}</p>
              {layout.blocks.length > 1 && <button type="button" className="btn small danger" onClick={() => setLayout({ ...layout, blocks: layout.blocks.filter((_, j) => j !== i) })}>Remove block</button>}
            </div>
          ))}
          <div><button type="button" className="btn" onClick={() => setLayout({ ...layout, blocks: [...layout.blocks, { name: `Block ${String.fromCharCode(65 + layout.blocks.length)}`, prefix: `${String.fromCharCode(65 + layout.blocks.length)}-`, floors: 5, start: 1, perFloor: 4, plans: [planNames[0]] }] })}>Add block</button></div>
          <p><b>{all.length} flats in total.</b>{dupes.length > 0 && <span className="err"> Some flat numbers repeat. Give each block its own prefix.</span>}</p>
        </div>
      </section>

      <section className="panel">
        <h2>3. Society details</h2>
        <form onSubmit={create} noValidate className="form-grid two" style={{ marginTop: 12 }}>
          <label className="field"><span>Society name</span><input type="text" value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} /></label>
          <label className="field"><span>City</span><input type="text" name="city" defaultValue="Visakhapatnam" /></label>
          <label className="field"><span>Web address</span><input type="text" value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }} /><small>Residents sign in at tierbridge…/{slug || 'society-name'}</small></label>
          <label className="field"><span>Monthly maintenance per flat (₹) <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="number" name="amount" min={1} placeholder="Admins can set it later" /></label>
          <label className="field"><span>Free trial (days)</span><input type="number" name="days" min={1} max={365} defaultValue={30} /></label>
          <label className="field"><span>Also save this layout as a template <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="text" name="save_as" placeholder="Template name" /></label>
          <p role="alert" className="err full">{err}</p>
          <div className="full"><button className="btn primary" type="submit" disabled={busy}>Create society with {all.length} flats</button></div>
        </form>
      </section>
    </>
  );
}
