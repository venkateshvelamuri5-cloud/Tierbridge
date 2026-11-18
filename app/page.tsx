'use client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { db, friendly } from '@/lib/supabase';
import { Logo } from '@/components/Logo';

const FEATURES = [
  { title: 'Pay by UPI, mark it paid', body: 'Residents pay to the society’s UPI ID or QR code, then mark the month as paid with the UTR and date. Cash works too.' },
  { title: 'Admins verify every payment', body: 'Admins confirm each payment or mark it not received with a reason, so no one is marked paid by mistake.' },
  { title: 'Every expense has its bill', body: 'Electricity, the watchman’s salary, repairs: each one carries a photo of the bill that every resident can open.' },
  { title: 'Pending dues and reminders', body: 'See which flats owe what, and send a WhatsApp reminder to a flat or the whole group in one tap.' },
  { title: 'Monthly statement', body: 'Opening balance, collections, expenses and closing balance, saved as a PDF or shared as a WhatsApp summary.' },
  { title: 'Owners and tenants', body: 'Each flat has an owner and a tenant login. Owners see whether their tenant has paid, and hand over when tenants change.' },
  { title: 'Notice board', body: 'Admins post notices with photos or PDFs, pin the important ones and see who has read them.' },
  { title: 'Complaints desk', body: 'Raise an issue like a leak or a broken lift, or a private grievance, and follow it until it’s resolved.' },
];

const SAMPLE = (() => {
  const unpaid = new Set(['402', '203']); const waiting = new Set(['501', '102']); const out: { no: string; s: string }[] = [];
  for (let f = 5; f >= 1; f--) for (let u = 1; u <= 3; u++) { const no = `${f}0${u}`; out.push({ no, s: unpaid.has(no) ? 'unpaid' : waiting.has(no) ? 'marked' : 'verified' }); }
  return out;
})();
const SAMPLE_STYLE: Record<string, React.CSSProperties> = {
  verified: { background: '#F2C14E', color: '#3A2E05' },
  marked: { background: '#FBEFD0', color: '#5C3D05', border: '1px dashed #B07A12' },
  unpaid: { background: '#2B3D4C', color: '#C3CFDA' },
};

export default function Landing() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [form, setForm] = useState<{ done?: any; error?: string; busy?: boolean }>({});

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      const { data } = await db().rpc('search_societies', { q: q.trim() });
      setResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || '').trim();
    const data = { society_name: v('society'), city: v('city'), flats: Number(v('flats')), role: v('role'), name: v('name'), mobile: v('mobile'), email: v('email') || null };
    if (!data.society_name || !data.city || !data.flats || !data.name || !data.mobile) { setForm({ error: 'Fill in the society name, city, number of flats, your name and mobile number.' }); return; }
    if (data.mobile.replace(/\D/g, '').length < 10) { setForm({ error: 'Enter a 10-digit mobile number.' }); return; }
    setForm({ busy: true });
    const { error } = await db().from('leads').insert(data);
    if (error) { setForm({ error: friendly(error) }); return; }
    setForm({ done: data });
  }

  return (
    <div className="landing">
      <div className="topnav">
        <nav aria-label="Main" className="glass bar">
          <Link href="/" className="brand"><Logo /> Tierbridge</Link>
          <a href="#how" className="btn link" style={{ textDecoration: 'none', color: 'var(--ink-2)', padding: '12px 6px' }}>How it works</a>
          <a href="#features" className="btn link" style={{ textDecoration: 'none', color: 'var(--ink-2)', padding: '12px 6px' }}>Features</a>
          <a href="#pricing" className="btn link" style={{ textDecoration: 'none', color: 'var(--ink-2)', padding: '12px 6px' }}>Pricing</a>
          <a href="#register" className="btn primary">Register your society</a>
        </nav>
      </div>

      <section className="section" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 48, paddingTop: 72 }}>
        <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h1>Every flat can see where the maintenance money goes.</h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--ink-2)', maxWidth: '34rem' }}>Tierbridge is a shared ledger for apartment societies. Residents pay by UPI and mark it with the reference number, admins verify it, and every expense carries its bill.</p>
          <div className="glass" style={{ padding: 20, maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="society-search" style={{ fontWeight: 600 }}>Find your apartment</label>
            <input id="society-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by society name or city" autoComplete="off" />
            {results && results.length > 0 && (
              <ul className="list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((r) => (
                  <li key={r.slug} className="spread" style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.8)', border: 0 }}>
                    <span><b style={{ display: 'block' }}>{r.name}</b><span className="small muted">{r.city} · {r.flats} flats</span></span>
                    <Link href={`/${r.slug}`} style={{ fontWeight: 600, padding: '10px 4px' }}>Sign in</Link>
                  </li>
                ))}
              </ul>
            )}
            {results && results.length === 0 && <p className="muted">Your society isn’t on Tierbridge yet. <a href="#register" style={{ fontWeight: 600 }}>Register it</a> and we’ll set it up with you.</p>}
          </div>
        </div>
        <figure className="glass" style={{ flex: '1 1 420px', minWidth: 0, margin: 0, padding: 28, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="spread"><b>November, at a glance</b><span className="small muted">Example building</span></div>
          <div className="mini-building" role="img" aria-label="A building of 15 flats on 5 floors: 11 paid, 2 awaiting an admin check, 2 not paid">
            {SAMPLE.map((w) => <div key={w.no} style={SAMPLE_STYLE[w.s]}>{w.no}</div>)}
          </div>
          <div className="legend" style={{ marginTop: 0 }}>
            <span><i style={{ background: '#F2C14E' }} />Paid</span>
            <span><i style={{ background: '#FBEFD0', border: '1px dashed #B07A12' }} />Awaiting check</span>
            <span><i style={{ background: '#2B3D4C' }} />Not paid</span>
          </div>
          <dl className="stat-row" style={{ margin: 0 }}>
            <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14 }}><dt className="small muted">Collected</dt><dd style={{ margin: 0 }}><b>₹13,000</b></dd></div>
            <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14 }}><dt className="small muted">Spent</dt><dd style={{ margin: 0 }}><b>₹9,600</b></dd></div>
            <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14 }}><dt className="small muted">Fund balance</dt><dd style={{ margin: 0 }}><b>₹46,900</b></dd></div>
          </dl>
          <figcaption className="small muted">Each lit window is a flat that has paid this month. Every resident sees the same view.</figcaption>
        </figure>
      </section>

      <section id="how" className="section">
        <h2 className="big">Set up in an evening. Visible to everyone from day one.</h2>
        <ol className="cards" style={{ marginTop: 32 }}>
          {[
            ['Pick your building', 'Choose from ten common layouts, like stilt + 5 with four flats a floor, or describe your own blocks, floors and plans. Set the maintenance and your UPI ID.'],
            ['Share the logins', 'Every flat gets an owner and a tenant login in one click. Post one message in your WhatsApp group, and each resident sets their own password.'],
            ['Everyone sees the money', 'Who has paid, what was spent and the balance in the fund, with a statement each month you can share in the group.'],
          ].map(([t, b], i) => (
            <li key={t} className="glass"><span className="step-no">{i + 1}</span><h3>{t}</h3><p className="muted">{b}</p></li>
          ))}
        </ol>
      </section>

      <section id="features" className="section">
        <h2 className="big">Built for the questions every society argues about.</h2>
        <ul className="cards" style={{ marginTop: 32 }}>
          {FEATURES.map((f) => <li key={f.title} className="glass"><h3>{f.title}</h3><p className="muted">{f.body}</p></li>)}
        </ul>
      </section>

      <section id="pricing" className="section" style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}>
        <div style={{ flex: '1 1 400px', minWidth: 0 }} className="stack">
          <h2 className="big">One simple price.</h2>
          <p className="muted" style={{ fontSize: '1.1rem', maxWidth: '30rem' }}>Every feature, for every flat. Try it free for a month, with no setup fee and no charge per admin.</p>
        </div>
        <div className="glass stack" style={{ flex: '1 1 400px', minWidth: 0, padding: 36, borderRadius: 28 }}>
          <p style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}><span style={{ fontWeight: 700, fontSize: '4rem', lineHeight: 1, letterSpacing: '-0.03em' }}>₹50</span><span className="muted" style={{ fontSize: '1.1rem' }}>per flat, per year</span></p>
          <p>Your first month is free. After that, a 15-flat building pays ₹750 a year, under ₹5 a month per flat.</p>
          <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Owner and tenant logins for every flat</li>
            <li>Payments, expenses with bills, dues and monthly statements</li>
            <li>Notice board and complaints desk</li>
            <li>WhatsApp reminders and sharing</li>
          </ul>
          <a href="#register" className="btn primary" style={{ alignSelf: 'flex-start' }}>Register your society</a>
        </div>
      </section>

      <section id="register" className="section">
        <div className="glass" style={{ padding: 36, borderRadius: 32, display: 'flex', flexWrap: 'wrap', gap: 40 }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }} className="stack">
            <h2 className="big">Register your society</h2>
            <p className="muted" style={{ fontSize: '1.1rem' }}>Tell us about your building. We’ll call you to set it up from one of our building templates, and your first month is free.</p>
          </div>
          <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            {form.done ? (
              <div role="status" className="stack" style={{ padding: 28, borderRadius: 20, background: 'rgba(255,255,255,.8)' }}>
                <p style={{ fontWeight: 700, fontSize: '1.4rem' }}>Thanks, {form.done.name}.</p>
                <p className="muted">We’ll call you on {form.done.mobile} to set up {form.done.society_name}.</p>
              </div>
            ) : (
              <form onSubmit={register} noValidate className="form-grid two">
                <label className="field"><span>Society or apartment name</span><input name="society" type="text" autoComplete="organization" required /></label>
                <label className="field"><span>City</span><input name="city" type="text" autoComplete="address-level2" required /></label>
                <label className="field"><span>Number of flats</span><input name="flats" type="number" min={2} inputMode="numeric" required /></label>
                <label className="field"><span>Your role</span><select name="role"><option>Committee member or admin</option><option>Owner</option><option>Tenant</option></select></label>
                <label className="field"><span>Your name</span><input name="name" type="text" autoComplete="name" required /></label>
                <label className="field"><span>Mobile number</span><input name="mobile" type="tel" autoComplete="tel" inputMode="tel" required /></label>
                <label className="field full"><span>Email <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input name="email" type="email" autoComplete="email" /></label>
                <p role="alert" className="err full">{form.error}</p>
                <div className="full"><button type="submit" className="btn primary" disabled={form.busy}>Register your society</button></div>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="section" style={{ paddingTop: 0 }}>
        <div className="glass spread" style={{ padding: '18px 22px', borderRadius: 18 }}>
          <span className="muted">Tierbridge is a product of Kasha Tech Solutions.</span>
          <Link href="/admin" className="small">Tierbridge team sign-in</Link>
        </div>
      </footer>
    </div>
  );
}
