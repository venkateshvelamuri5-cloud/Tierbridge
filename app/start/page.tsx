'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, friendly, must } from '@/lib/supabase';
import { loginEmail } from '@/lib/config';
import { slugify } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { allNumbers, clone, duplicates, flatCount, Layout, LayoutEditor } from '@/components/LayoutEditor';

export default function Start() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [tpl, setTpl] = useState<any>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugFree, setSlugFree] = useState<boolean | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { db().rpc('public_templates').then(({ data }) => setTemplates(data || [])); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setFound(null); return; }
    const t = setTimeout(async () => setFound((await db().rpc('search_societies', { q: q.trim() })).data || []), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!slug) { setSlugFree(null); return; }
    const t = setTimeout(async () => setSlugFree(!!(await db().rpc('slug_available', { p_slug: slug })).data), 300);
    return () => clearTimeout(t);
  }, [slug]);

  const flats = useMemo(() => (layout ? allNumbers(layout) : []), [layout]);
  const choose = (t: any) => { setTpl(t); setLayout(clone(t.layout)); setTimeout(() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' }), 50); };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || '').trim();
    setErr('');
    if (!layout) { setErr('Pick a building template first.'); return; }
    if (!name.trim() || !v('city')) { setErr('Enter your society’s name and city.'); return; }
    if (!slugFree) { setErr('Choose a web address that isn’t taken.'); return; }
    if (duplicates(layout).length) { setErr('Some flat numbers repeat. Give each block its own prefix.'); return; }
    if (!v('flat')) { setErr('Choose your flat.'); return; }
    if (v('full_name').length < 2) { setErr('Enter your name.'); return; }
    if (v('phone').replace(/\D/g, '').length < 10) { setErr('Enter a 10-digit mobile number.'); return; }
    if (v('p1').length < 8) { setErr('Choose a password of at least 8 characters.'); return; }
    if (v('p1') !== v('p2')) { setErr('The two passwords don’t match.'); return; }
    if (f.get('agree') !== 'on') { setErr('Confirm that you’re an owner or committee member of this society.'); return; }
    setBusy(true);
    try {
      const res = must(await db().rpc('self_signup', {
        p_name: name.trim(), p_slug: slug, p_city: v('city'), p_template: tpl?.id || null, p_layout: layout,
        p_my_flat: v('flat'), p_password: v('p1'), p_full_name: v('full_name'), p_phone: v('phone'), p_email: v('email') || null,
      })) as any[];
      const r = res[0];
      must(await db().auth.signInWithPassword({ email: loginEmail(r.slug, r.login_id), password: v('p1') }) as any);
      router.push(`/${r.slug}?welcome=1`);
    } catch (e2) { setErr(friendly(e2)); setBusy(false); }
  }

  return (
    <div className="landing">
      <div className="topnav"><nav aria-label="Main" className="glass bar"><Link href="/" className="brand"><Logo /> Tierbridge</Link></nav></div>
      <main className="section stack" style={{ paddingTop: 32 }}>
        <div><h1>Start your free month</h1><p className="muted" style={{ fontSize: '1.1rem', marginTop: 8, maxWidth: '40rem' }}>Set up your society in a few minutes. Every flat gets its logins, and you become the first admin. Free for 30 days, then {'₹'}50 per flat per year.</p></div>

        <section className="panel">
          <h2>Is your society already on Tierbridge?</h2>
          <label className="field" style={{ marginTop: 12, maxWidth: 480 }}><span className="sr-only">Search</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by society name or city" /></label>
          {found && found.length > 0 && <ul className="list">{found.map((s) => <li key={s.slug} className="spread"><span><b>{s.name}</b> <span className="small muted">{s.city} · {s.flats} flats</span></span><Link href={`/${s.slug}`}>It’s here: sign in</Link></li>)}</ul>}
          {found && found.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Not found. Set it up below.</p>}
        </section>

        <section className="panel">
          <h2>1. Pick the layout closest to your building</h2>
          {templates === null ? <p className="muted">Loading…</p> : (
            <div className="tpl-grid" style={{ marginTop: 12 }}>
              {templates.map((t) => (
                <button key={t.id} type="button" className="tpl" aria-pressed={tpl?.id === t.id} onClick={() => choose(t)}>
                  <b>{t.name}</b><span className="small muted">{t.description}</span><span className="small">{flatCount(t.layout)} flats</span>
                </button>
              ))}
            </div>
          )}
          {layout && (
            <details style={{ marginTop: 16 }}>
              <summary><b>Adjust floors, flats per floor or numbering</b> <span className="muted small">({flatCount(layout)} flats)</span></summary>
              <div style={{ marginTop: 12 }}><LayoutEditor layout={layout} onChange={setLayout} /></div>
            </details>
          )}
        </section>

        <section className="panel" id="details">
          <h2>2. Your society and you</h2>
          <form onSubmit={submit} noValidate className="form-grid two" style={{ marginTop: 12 }}>
            <label className="field"><span>Society or apartment name</span><input type="text" value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} autoComplete="organization" /></label>
            <label className="field"><span>City</span><input type="text" name="city" defaultValue="Visakhapatnam" autoComplete="address-level2" /></label>
            <label className="field full"><span>Your society’s web address</span><input type="text" value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} />
              <small>{slug ? <>Residents will sign in at <b>tierbridge.in/{slug}</b>{slugFree === false ? <span className="err"> · taken, try adding your area</span> : slugFree ? ' · available' : ''}</> : 'Filled in from the name. Lowercase letters, numbers and hyphens.'}</small></label>
            <label className="field"><span>Your flat</span><select name="flat" defaultValue=""><option value="" disabled>{layout ? 'Choose your flat' : 'Pick a layout first'}</option>{flats.map((n) => <option key={n} value={n}>{n}</option>)}</select><small>You’ll sign in as its owner and become the first admin.</small></label>
            <label className="field"><span>Your name</span><input type="text" name="full_name" autoComplete="name" /></label>
            <label className="field"><span>Mobile number</span><input type="tel" name="phone" autoComplete="tel" inputMode="tel" /></label>
            <label className="field"><span>Email <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="email" name="email" autoComplete="email" /><small>For trial reminders.</small></label>
            <label className="field"><span>Choose a password</span><input type="password" name="p1" autoComplete="new-password" minLength={8} /><small>At least 8 characters.</small></label>
            <label className="field"><span>Type it again</span><input type="password" name="p2" autoComplete="new-password" /></label>
            <label className="check full"><input type="checkbox" name="agree" /> <span>I’m an owner or committee member of this society. Residents’ names and the numbers they add will be visible to others in the society (admins can change this).</span></label>
            <p role="alert" className="err full">{err}</p>
            <div className="full btn-row"><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Setting up…' : `Start the free month${layout ? ` for ${flatCount(layout)} flats` : ''}`}</button><span className="small muted">Prefer us to set it up? <Link href="/#register">Register and we’ll call you.</Link></span></div>
          </form>
        </section>
      </main>
    </div>
  );
}
