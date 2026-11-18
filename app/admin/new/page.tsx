'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, friendly, must } from '@/lib/supabase';
import { slugify } from '@/lib/format';
import { useRun, useToast } from '@/components/ui';
import { BLANK_LAYOUT, clone, duplicates, flatCount, Layout, LayoutEditor } from '@/components/LayoutEditor';

export default function NewSociety() {
  const router = useRouter();
  const toast = useToast();
  const { busy, run } = useRun();
  const [templates, setTemplates] = useState<any[]>([]);
  const [tpl, setTpl] = useState<string>('custom');
  const [layout, setLayout] = useState<Layout>(BLANK_LAYOUT);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { db().from('templates').select('*').order('sort').then((r) => { try { setTemplates(must(r) as any[]); } catch (e) { toast(friendly(e), true); } }); }, [toast]);
  const pick = (t: any) => { setTpl(t ? t.id : 'custom'); setLayout(t ? clone(t.layout) : BLANK_LAYOUT); };
  const total = flatCount(layout);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const city = String(f.get('city') || '').trim(); const amount = Number(f.get('amount')) || null; const days = Number(f.get('days')) || 30;
    setErr('');
    if (!name.trim() || !city) { setErr('Enter the society’s name and city.'); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setErr('The web address can only use lowercase letters, numbers and single hyphens.'); return; }
    if (!total) { setErr('The layout has no flats.'); return; }
    if (duplicates(layout).length) { setErr('Some flat numbers repeat. Give blocks different prefixes.'); return; }
    await run(async () => {
      const id = must(await db().rpc('create_society', { p_name: name.trim(), p_slug: slug, p_city: city, p_template: tpl === 'custom' ? null : tpl, p_layout: layout, p_trial_days: days, p_amount: amount })) as string;
      toast(`Created ${name.trim()}`); router.push(`/admin/s/${id}`);
    });
  }

  return (
    <>
      <div className="page-head"><div><h1>New society</h1><p className="muted">For societies you set up yourself. Pick the closest template, adjust it, then create it. The free trial starts today.</p></div></div>
      <section className="panel">
        <h2>1. Building template</h2>
        <div className="tpl-grid" style={{ marginTop: 12 }}>
          {templates.map((t) => (
            <button key={t.id} type="button" className="tpl" aria-pressed={tpl === t.id} onClick={() => pick(t)}>
              <b>{t.name}</b><span className="small muted">{t.description}</span>
              <span className="small">{flatCount(t.layout)} flats{!t.visible && ' · hidden from sign-up'}</span>
            </button>
          ))}
          <button type="button" className="tpl" aria-pressed={tpl === 'custom'} onClick={() => pick(null)}><b>Custom</b><span className="small muted">Start from a blank layout</span></button>
        </div>
      </section>
      <section className="panel"><h2>2. Adjust the layout</h2><div style={{ marginTop: 12 }}><LayoutEditor layout={layout} onChange={setLayout} /></div></section>
      <section className="panel">
        <h2>3. Society details</h2>
        <form onSubmit={create} noValidate className="form-grid two" style={{ marginTop: 12 }}>
          <label className="field"><span>Society name</span><input type="text" value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} /></label>
          <label className="field"><span>City</span><input type="text" name="city" defaultValue="Visakhapatnam" /></label>
          <label className="field"><span>Web address</span><input type="text" value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }} /><small>Residents sign in at tierbridge.in/{slug || 'society-name'}</small></label>
          <label className="field"><span>Monthly maintenance per flat (₹) <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="number" name="amount" min={1} placeholder="Admins can set it later" /></label>
          <label className="field"><span>Free trial (days)</span><input type="number" name="days" min={1} max={365} defaultValue={30} /></label>
          <p role="alert" className="err full">{err}</p>
          <div className="full"><button className="btn primary" type="submit" disabled={busy}>Create society with {total} flats</button></div>
        </form>
      </section>
    </>
  );
}
