'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { db, friendly, must } from '@/lib/supabase';
import { dateLabel, daysUntil, inr, timeLabel, todayISO, waLink } from '@/lib/format';
import { PRICE_PER_FLAT } from '@/lib/config';
import { Badge, Empty, Modal, useRun, useToast } from '@/components/ui';

export default function SocietyDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const toast = useToast();
  const { busy, run } = useRun();
  const [o, setO] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [created, setCreated] = useState<any[] | null>(null);
  const [payFor, setPayFor] = useState<any>(null);
  const [price, setPrice] = useState({ per: PRICE_PER_FLAT, disc: 0, fixed: '', years: 1 });

  const load = useCallback(async () => {
    const c = db();
    const [ov, s, m, u, l] = await Promise.all([
      c.rpc('platform_overview'), c.from('subscriptions').select('*').eq('society_id', id).order('created_at', { ascending: false }),
      c.from('members').select('*').eq('society_id', id), c.from('units').select('id,number,floor').eq('society_id', id).order('floor').order('number'),
      c.from('platform_log').select('*').eq('society_id', id).order('at', { ascending: false }).limit(30),
    ]);
    try {
      setO((must(ov) as any[]).find((x) => x.id === id) || null); setSubs(must(s) as any[]); setMembers(must(m) as any[]); setUnits(must(u) as any[]); setLog(must(l) as any[]);
    } catch (e) { toast(friendly(e), true); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load]);

  if (!o) return <p className="muted">Loading…</p>;
  const flats = Number(o.flats);
  const quote = price.fixed !== '' ? Number(price.fixed) * price.years : Math.round(flats * price.per * (1 - price.disc / 100) * 100) / 100 * price.years;
  const owners = members.filter((m) => m.role === 'owner');
  const unitNo = (uid: string) => units.find((u) => u.id === uid)?.number || '';

  const extend = (days: number) => run(async () => {
    const reason = window.prompt(`Reason for extending the trial by ${days} days (optional)`) || '';
    must(await db().rpc('extend_trial', { p_society: id, p_days: days, p_reason: reason })); toast('Trial extended'); await load();
  });
  async function setSubscription(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const note = String(new FormData(e.currentTarget).get('note') || '').trim();
    await run(async () => {
      must(await db().rpc('set_subscription', { p_society: id, p_price_per_flat: price.per, p_discount_pct: price.disc, p_fixed_amount: price.fixed === '' ? null : Number(price.fixed), p_term_years: price.years, p_note: note || null }));
      toast('Price saved. The society’s admins now see this amount when they upgrade.'); await load();
    });
  }
  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await run(async () => {
      must(await db().rpc('record_subscription_payment', { p_subscription: payFor.id, p_amount: Number(f.get('amount')), p_ref: String(f.get('ref') || '').trim() || null, p_paid_on: String(f.get('paid_on')) }));
      setPayFor(null); toast('Payment recorded. The society is now paid.'); await load();
    });
  }
  const markChecked = () => run(async () => { must(await db().from('societies').update({ verified: true }).eq('id', id)); toast('Marked as checked'); await load(); });
  const cancel = () => run(async () => {
    if (!window.confirm(`Cancel ${o.name}? Residents will no longer be able to sign in, and it disappears from search. Its records are kept.`)) return;
    must(await db().from('societies').update({ status: 'cancelled' }).eq('id', id)); toast('Society cancelled'); await load();
  });
  const createLogins = (mode: string) => run(async () => { setCreated(must(await db().rpc('create_logins', { p_society: id, p_mode: mode })) as any[]); await load(); });
  const toggleAdmin = (m: any) => run(async () => { must(await db().from('members').update({ is_admin: !m.is_admin }).eq('user_id', m.user_id)); toast('Saved'); await load(); });
  const download = (rows: any[]) => {
    const lines = [['Login ID', 'Flat', 'Role', 'Temporary password'], ...rows.map((r) => [r.login_id, r.unit_number, r.role, r.temp_password])];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.map((l) => l.map((v) => `"${v}"`).join(',')).join('\r\n')], { type: 'text/csv' })); a.download = `${o.slug}-logins-PRIVATE.csv`; a.click();
  };
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${o.slug}` : '';

  return (
    <>
      <div className="page-head">
        <div><h1>{o.name}</h1><p className="muted">{o.city} · {flats} flats · <Link href={`/${o.slug}`}>/{o.slug}</Link> · created {dateLabel(o.created_at)}{o.template_id ? ` from the ${o.template_id} template` : ''}</p></div>
        <div className="btn-row"><Badge status={o.status} />{o.source === 'self_signup' && <span className="badge info">Self sign-up</span>}</div>
      </div>
      {o.source === 'self_signup' && !o.verified && (
        <p className="note warn spread" style={{ marginBottom: 16 }}><span>This society signed itself up. Call its admin ({o.admin_names || 'unknown'}{o.admin_phones ? `, ${o.admin_phones}` : ''}{o.contact_email ? `, ${o.contact_email}` : ''}) to confirm it’s genuine.</span>
          <span className="btn-row"><button className="btn small good" disabled={busy} onClick={markChecked}>Mark as checked</button>{o.status !== 'cancelled' && <button className="btn small danger" disabled={busy} onClick={cancel}>Cancel society</button>}</span></p>
      )}
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="glass">{o.status === 'active' ? 'Paid until' : 'Trial ends'}<b>{dateLabel(o.status === 'active' ? o.paid_until : o.trial_ends_on)}</b><span className="small muted">{o.status === 'trial' ? `${daysUntil(o.trial_ends_on)} days left` : ''}</span></div>
        <div className="glass">Logins signed in<b>{o.signed_in} of {o.logins}</b></div>
        <div className="glass">Payments marked<b>{o.payments_30d}</b><span className="small muted">last 30 days</span></div>
        <div className="glass">Expenses added<b>{o.expenses_30d}</b><span className="small muted">last 30 days</span></div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Trial and price</h2>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn small" disabled={busy} onClick={() => extend(7)}>Extend trial 7 days</button>
            <button className="btn small" disabled={busy} onClick={() => extend(30)}>Extend trial 30 days</button>
          </div>
          <form onSubmit={setSubscription} noValidate className="form-grid two" style={{ marginTop: 16 }}>
            <label className="field"><span>Price per flat per year (₹)</span><input type="number" min={0} value={price.per} onChange={(e) => setPrice({ ...price, per: Number(e.target.value) })} /></label>
            <label className="field"><span>Discount (%)</span><input type="number" min={0} max={100} value={price.disc} onChange={(e) => setPrice({ ...price, disc: Number(e.target.value) })} /></label>
            <label className="field"><span>Or a fixed yearly amount (₹)</span><input type="number" min={0} value={price.fixed} placeholder="Leave empty to use per-flat price" onChange={(e) => setPrice({ ...price, fixed: e.target.value })} /></label>
            <label className="field"><span>Term</span><select value={price.years} onChange={(e) => setPrice({ ...price, years: Number(e.target.value) })}>{[1, 2, 3].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}</select></label>
            <label className="field full"><span>Note about the agreement</span><input type="text" name="note" placeholder="e.g. 20% off for a 2-year commitment, agreed with the secretary" /></label>
            <p className="full">Amount due: <b>{inr(quote)}</b> for {price.years} year{price.years > 1 ? 's' : ''} ({flats} flats).</p>
            <div className="full"><button className="btn primary" type="submit" disabled={busy}>Save price</button></div>
          </form>
          <h3 style={{ marginTop: 20 }}>Subscriptions</h3>
          {subs.length ? <ul className="list">{subs.map((x) => (
            <li key={x.id} className="spread" style={{ alignItems: 'flex-start' }}>
              <div><b>{inr(x.amount_due)}</b> for {x.term_years} year{x.term_years > 1 ? 's' : ''} · {dateLabel(x.starts_on)} to {dateLabel(x.ends_on)} <Badge status={x.status === 'paid' ? 'verified' : x.status === 'pending' ? 'pending' : 'cancelled'}>{x.status === 'paid' ? 'Paid' : x.status === 'pending' ? 'Awaiting payment' : 'Replaced'}</Badge>
                <div className="small muted">{x.discount_pct > 0 ? `${x.discount_pct}% off · ` : ''}{x.fixed_amount != null ? 'fixed amount · ' : `${inr(x.price_per_flat)} per flat · `}{x.note || ''}{x.paid_on ? ` · paid ${dateLabel(x.paid_on)}${x.payment_ref ? `, ref ${x.payment_ref}` : ''}` : ''}</div></div>
              {x.status === 'pending' && <button className="btn good small" onClick={() => setPayFor(x)}>Record payment</button>}
            </li>))}</ul> : <p className="muted small" style={{ marginTop: 6 }}>No price set yet. Without one, admins see the standard {inr(flats * PRICE_PER_FLAT)} a year.</p>}
        </section>

        <section className="panel">
          <h2>Logins and admins</h2>
          {o.logins === 0 ? (
            <div className="stack" style={{ marginTop: 12 }}>
              <p className="muted">No logins yet. Create an owner and a tenant login for every flat.</p>
              <div className="btn-row"><button className="btn primary" disabled={busy} onClick={() => createLogins('same')}>Create logins (password = login ID)</button><button className="btn" disabled={busy} onClick={() => createLogins('random')}>Create with random passwords</button></div>
            </div>
          ) : (
            <>
              <p className="small muted" style={{ marginTop: 6 }}>Make the owners who run the society’s accounts admins. They can then manage everything else from the society’s own Settings and Residents pages.</p>
              <div className="table-wrap" style={{ marginTop: 8 }}><table>
                <thead><tr><th>Owner login</th><th>Name</th><th></th></tr></thead>
                <tbody>{owners.sort((a, b) => a.login_id.localeCompare(b.login_id, undefined, { numeric: true })).map((m) => (
                  <tr key={m.user_id}><td>{m.login_id}{m.is_admin && <span className="badge brand" style={{ marginLeft: 6 }}>Admin</span>}</td><td className="small">{m.full_name || <span className="muted">Not set</span>}{m.phone && <div className="muted">{m.phone}</div>}</td>
                    <td><button className="btn small" disabled={busy} onClick={() => toggleAdmin(m)}>{m.is_admin ? 'Remove admin' : 'Make admin'}</button></td></tr>))}</tbody>
              </table></div>
            </>
          )}
        </section>
      </div>

      {(o.source !== 'self_signup' || o.verified) && o.status !== 'cancelled' && <p style={{ marginTop: 16 }}><button className="btn danger small" disabled={busy} onClick={cancel}>Cancel this society</button></p>}
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Console history</h2>
        {log.length ? <ul className="list">{log.map((l) => <li key={l.id}><div className="log-time">{timeLabel(l.at)}</div>{l.summary}</li>)}</ul> : <Empty>Nothing yet.</Empty>}
      </section>

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title="Record a subscription payment">
        {payFor && (
          <form onSubmit={recordPayment} className="stack">
            <p className="muted">Mark {inr(payFor.amount_due)} as received. The society becomes paid until {dateLabel(payFor.ends_on)}.</p>
            <label className="field"><span>Amount received (₹)</span><input type="number" name="amount" defaultValue={payFor.amount_due} min={0} step="0.01" /></label>
            <label className="field"><span>UPI or bank reference</span><input type="text" name="ref" /></label>
            <label className="field"><span>Received on</span><input type="date" name="paid_on" defaultValue={todayISO()} max={todayISO()} /></label>
            <div className="btn-row"><button className="btn primary" type="submit" disabled={busy}>Record payment</button><button className="btn" type="button" onClick={() => setPayFor(null)}>Cancel</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title={`Created ${created?.length || 0} logins`}>
        <div className="stack">
          <p className="muted">Download the sheet and keep it private, then hand it to the society’s admins.</p>
          <div className="btn-row">
            <button className="btn primary" onClick={() => created && download(created)}>Download login sheet</button>
            <a className="btn" target="_blank" rel="noopener" href={waLink('', `Welcome to ${o.name} on Tierbridge.\nSign in at ${url}\nLogin ID: your flat number, then -owner or -tenant (for example 101-owner).\nYou'll be asked to choose your own password.`)}>Draft the welcome message</a>
          </div>
          <p className="small muted">Flats: {created?.slice(0, 6).map((r) => r.login_id).join(', ')}{(created?.length || 0) > 6 ? '…' : ''}</p>
        </div>
      </Modal>
    </>
  );
}
