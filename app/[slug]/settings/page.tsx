'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { addMonths, dateLabel, daysUntil, inr, monthLabel, thisMonth, waLink } from '@/lib/format';
import { BILLING, PRICE_PER_FLAT } from '@/lib/config';
import { Badge, Empty, useRun, useToast } from '@/components/ui';

export default function Settings() {
  const s = useSociety();
  if (!s.isAdmin) return <Empty>Only admins can change settings.</Empty>;
  return <SettingsInner />;
}

function SettingsInner() {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const [err, setErr] = useState('');
  const [sub, setSub] = useState<any>(null);
  const st = s.society;
  const rates = s.rates.slice().sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  useEffect(() => { db().rpc('my_subscription', { p_society: st.id }).then(({ data }) => setSub(data?.[0] || null)); }, [st.id]);

  async function saveRate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const from = String(f.get('from') || ''), amount = Number(f.get('amount')), plan = String(f.get('plan') || '');
    if (!from || !(amount > 0)) { toast('Choose the month and enter the amount.', true); return; }
    await run(async () => {
      const eff = `${from}-01`;
      const existing = s.rates.find((r) => r.effective_from === eff && (r.plan_id || '') === plan);
      if (existing) must(await db().from('rates').update({ amount }).eq('id', existing.id));
      else must(await db().from('rates').insert({ society_id: st.id, effective_from: eff, amount, plan_id: plan || null }));
      toast(`Maintenance set to ${inr(amount)} from ${monthLabel(eff)}`); form.reset(); await s.refresh();
    });
  }
  const removeRate = (id: string) => run(async () => { must(await db().from('rates').delete().eq('id', id)); toast('Removed'); await s.refresh(); });

  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const upi = String(f.get('upi_id') || '').trim();
    setErr('');
    if (!String(f.get('name') || '').trim()) { setErr('Enter the society’s name.'); return; }
    if (upi && !/^[\w.\-]{2,}@[a-zA-Z][\w.\-]*$/.test(upi)) { setErr('That doesn’t look like a UPI ID. It should look like name@bank.'); return; }
    const qr = f.get('qr') as File;
    await run(async () => {
      const path = await s.upload(qr && qr.size ? qr : null, 'qr');
      const row: any = {
        name: String(f.get('name')).trim(), upi_id: upi || null, payee_name: String(f.get('payee_name') || '').trim() || null,
        opening_balance: Number(f.get('opening_balance')) || 0, start_month: `${f.get('start_month')}-01`,
        due_day: Math.min(28, Math.max(1, Number(f.get('due_day')) || 10)), phone_visibility: String(f.get('phone_visibility')),
      };
      if (path) row.qr_path = path; else if (f.get('clear_qr') === 'on') row.qr_path = null;
      must(await db().from('societies').update(row).eq('id', st.id)); toast('Settings saved'); await s.refresh();
    });
  }
  async function addPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const name = String(f.get('name') || '').trim(); if (!name) return;
    await run(async () => { must(await db().from('unit_plans').insert({ society_id: st.id, name, area_sqft: Number(f.get('area')) || null })); form.reset(); toast('Plan added'); await s.refresh(); });
  }

  const flats = s.units.length;
  const standard = flats * PRICE_PER_FLAT;
  const due = sub?.pending_amount ?? standard;
  const payNote = `Tierbridge subscription: ${st.name} (${st.slug})`;
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p className="muted">Only admins can change these. Every change is recorded in the activity log.</p></div></div>

      <section className="panel" id="plan">
        <div className="spread"><h2>Your Tierbridge plan</h2><Badge status={s.writable ? st.status : 'read_only'} /></div>
        {st.status === 'trial' && <p style={{ marginTop: 10 }}>Free trial {s.writable ? `until ${dateLabel(st.trial_ends_on)} (${daysUntil(st.trial_ends_on)} days left)` : `ended on ${dateLabel(st.trial_ends_on)}`}.</p>}
        {st.status === 'active' && st.paid_until && <p style={{ marginTop: 10 }}>Paid until {dateLabel(st.paid_until)}.</p>}
        <div className="totals">
          <div>Flats<b>{flats}</b></div>
          <div>Standard price<b>{inr(standard)} a year</b><span className="small muted">{inr(PRICE_PER_FLAT)} per flat</span></div>
          {sub?.pending_amount != null && <div>Agreed amount<b>{inr(sub.pending_amount)}</b><span className="small muted">for {sub.pending_term} year{sub.pending_term > 1 ? 's' : ''}{sub.pending_note ? ` · ${sub.pending_note}` : ''}</span></div>}
        </div>
        <p>To {st.status === 'active' ? 'renew' : 'upgrade'}, pay {inr(due)} to {BILLING.payeeName}{BILLING.upiId ? <> at UPI ID <b>{BILLING.upiId}</b></> : ''}, with “{payNote}” as the note. We’ll confirm and switch your society to paid, usually the same day.</p>
        <div className="btn-row" style={{ marginTop: 12 }}>
          {BILLING.upiId && <a className="btn primary" href={`upi://pay?pa=${encodeURIComponent(BILLING.upiId)}&pn=${encodeURIComponent(BILLING.payeeName)}&am=${Number(due).toFixed(2)}&cu=INR&tn=${encodeURIComponent(payNote.slice(0, 50))}`}>Pay with UPI app</a>}
          <a className="btn" target="_blank" rel="noopener" href={waLink(BILLING.whatsapp, `Hi, I'm an admin of ${st.name} (${st.slug}) on Tierbridge. ${s.writable ? 'We would like to upgrade.' : 'Our trial has ended and we would like to upgrade.'}`)}>Talk to Tierbridge on WhatsApp</a>
        </div>
      </section>

      {s.writable && (
        <div className="grid-2" style={{ marginTop: 16 }}>
          <section className="panel">
            <h2>Monthly maintenance</h2>
            <p className="small muted">When the amount changes, add the new amount from the month it starts. Earlier months keep their old amount. A plan-specific amount (for example 3BHK flats) overrides the general one.</p>
            {rates.length ? (
              <div className="table-wrap"><table>
                <thead><tr><th>From</th><th>Applies to</th><th className="right">Per flat</th><th></th></tr></thead>
                <tbody>{rates.map((r) => (
                  <tr key={r.id}><td>{monthLabel(r.effective_from, true)}</td><td>{r.plan_id ? `${s.plans.find((p) => p.id === r.plan_id)?.name} flats` : 'Every flat'}</td><td className="right num">{inr(r.amount)}</td>
                    <td>{(r.effective_from > thisMonth() || !s.payments.some((p) => p.month >= r.effective_from)) && <button className="btn danger small" disabled={busy} onClick={() => removeRate(r.id)}>Remove</button>}</td></tr>
                ))}</tbody></table></div>
            ) : <p className="note" style={{ marginTop: 12 }}>No amount set yet. Add one so residents can pay.</p>}
            <form onSubmit={saveRate} noValidate className="form-grid two" style={{ marginTop: 16 }}>
              <label className="field"><span>Starting month</span><input type="month" name="from" defaultValue={(rates.length ? addMonths(thisMonth(), 1) : st.start_month).slice(0, 7)} /></label>
              <label className="field"><span>Amount per flat (₹)</span><input type="number" name="amount" min={1} step={1} placeholder="1000" /></label>
              {s.plans.length > 1 && <label className="field full"><span>Applies to</span><select name="plan"><option value="">Every flat</option>{s.plans.map((p) => <option key={p.id} value={p.id}>{p.name} flats only</option>)}</select></label>}
              <div className="full"><button className="btn primary" type="submit" disabled={busy}>Save amount</button></div>
            </form>
            <h3 style={{ marginTop: 24 }}>Flat plans</h3>
            <p className="small muted" style={{ marginTop: 4 }}>{s.plans.length ? s.plans.map((p) => `${p.name}${p.area_sqft ? ` (${p.area_sqft} sq ft)` : ''}`).join(', ') : 'No plans yet.'} Assign plans to flats on the Residents page.</p>
            <form onSubmit={addPlan} noValidate className="form-grid two" style={{ marginTop: 10 }}>
              <label className="field"><span>Plan name</span><input type="text" name="name" placeholder="e.g. 3BHK" /></label>
              <label className="field"><span>Area (sq ft)</span><input type="number" name="area" min={100} /></label>
              <div className="full"><button className="btn" type="submit" disabled={busy}>Add plan</button></div>
            </form>
          </section>
          <section className="panel">
            <h2>Society and UPI details</h2>
            <form onSubmit={saveSettings} noValidate className="form-grid" style={{ marginTop: 12 }}>
              <label className="field"><span>Society name</span><input type="text" name="name" defaultValue={st.name} /></label>
              <label className="field"><span>UPI ID for maintenance</span><input type="text" name="upi_id" defaultValue={st.upi_id || ''} placeholder="e.g. society@okaxis" autoCapitalize="none" /><small>Residents see this on the Pay page. The QR code is made from it automatically.</small></label>
              <label className="field"><span>Name on the UPI account</span><input type="text" name="payee_name" defaultValue={st.payee_name || ''} /></label>
              <label className="field"><span>Your own QR image <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="file" name="qr" accept="image/*" /><small>{st.qr_path ? 'An uploaded QR is shown instead of the generated one. ' : ''}Upload one only if you prefer it.</small>
                {st.qr_path && <label className="check small" style={{ marginTop: 6 }}><input type="checkbox" name="clear_qr" /> Stop using the uploaded QR</label>}</label>
              <label className="field"><span>Fund balance before using Tierbridge (₹)</span><input type="number" name="opening_balance" step="0.01" defaultValue={st.opening_balance} /><small>The money already in the society account at the first month tracked.</small></label>
              <div className="form-grid two">
                <label className="field"><span>First month tracked</span><input type="month" name="start_month" defaultValue={st.start_month.slice(0, 7)} /></label>
                <label className="field"><span>Due by (day of month)</span><input type="number" name="due_day" min={1} max={28} defaultValue={st.due_day} /></label>
              </div>
              <label className="field"><span>Residents’ phone numbers are visible to</span><select name="phone_visibility" defaultValue={st.phone_visibility}><option value="all">All residents</option><option value="admins">Admins only</option></select></label>
              <p role="alert" className="err">{err}</p>
              <div><button className="btn primary" type="submit" disabled={busy}>Save settings</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
