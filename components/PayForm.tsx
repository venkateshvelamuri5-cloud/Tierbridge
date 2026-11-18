'use client';
import { FormEvent, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { inr, monthLabel, todayISO } from '@/lib/format';
import { useRun, useToast } from './ui';

export const methodText = (p: any) => p.method === 'cash' ? `Cash${p.note ? ` · ${p.note}` : ''}` : `${p.method === 'bank' ? 'Bank' : 'UPI'} ${p.utr || ''}`;

export function PayForm({ unitId, months, selected, asAdmin, existing, onDone }: {
  unitId: string; months: string[]; selected: string; asAdmin: boolean; existing?: any; onDone?: () => void;
}) {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const ex = existing || {};
  const [method, setMethod] = useState<string>(ex.method || 'upi');
  const [month, setMonth] = useState(selected);
  const [err, setErr] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const utr = String(f.get('utr') || '').trim(), paidOn = String(f.get('paid_on') || '');
    setErr('');
    if (method !== 'cash' && utr.length < 6) { setErr('Enter the UTR or reference number so the admins can match your payment.'); return; }
    if (!paidOn) { setErr('Enter the date you paid.'); return; }
    if (!s.rateFor(unitId, month)) { setErr('The maintenance amount for this month isn’t set yet. Ask an admin.'); return; }
    const file = f.get('shot') as File;
    await run(async () => {
      const shot = await s.upload(file && file.size ? file : null, 'screenshots');
      const row: any = { society_id: s.society.id, unit_id: unitId, month, method, utr: method === 'cash' ? null : utr, paid_on: paidOn, note: method === 'cash' ? String(f.get('cash_to') || '').trim() || null : null };
      if (shot) row.screenshot_path = shot;
      if (asAdmin) { row.amount = Number(f.get('amount')) || s.rateFor(unitId, month); row.status = 'verified'; } else row.status = 'marked';
      const prev = s.payFor(unitId, month);
      if (prev) must(await db().from('payments').update(row).eq('id', prev.id));
      else must(await db().from('payments').insert(row));
      toast(asAdmin ? 'Payment saved' : `Marked ${monthLabel(month)} as paid`);
      await s.refresh(); onDone?.();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="form-grid two" style={{ marginTop: 12 }}>
      <label className="field"><span>Month</span>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m, true)} · {s.rateFor(unitId, m) ? inr(s.rateFor(unitId, m)) : 'amount not set'}</option>)}
        </select></label>
      <label className="field"><span>Paid on</span><input type="date" name="paid_on" defaultValue={ex.paid_on || todayISO()} max={todayISO()} required /></label>
      <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 6 }}>Paid by</legend>
        <div className="seg">
          {[['upi', 'UPI'], ['cash', 'Cash'], ['bank', 'Bank transfer']].map(([v, l]) => (
            <label key={v}><input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} />{l}</label>
          ))}
        </div>
      </fieldset>
      {method !== 'cash' ? (
        <label className="field full"><span>UTR / reference number</span><input type="text" name="utr" inputMode="numeric" autoComplete="off" defaultValue={ex.utr || ''} placeholder="12-digit UTR from your UPI app" />
          <small>Find it in your UPI app’s transaction details (called UTR, UPI Ref No. or Transaction ID).</small></label>
      ) : (
        <label className="field full"><span>Who did you hand the cash to?</span><input type="text" name="cash_to" defaultValue={ex.method === 'cash' ? ex.note || '' : ''} placeholder="e.g. 303 owner" /></label>
      )}
      {asAdmin && <label className="field full"><span>Amount (₹)</span><input type="number" name="amount" min={1} step="0.01" defaultValue={ex.amount || s.rateFor(unitId, month) || ''} /></label>}
      <label className="field full"><span>Payment screenshot <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="file" name="shot" accept="image/*,application/pdf" /></label>
      <p role="alert" className="err full">{err}</p>
      <div className="full"><button className="btn primary" type="submit" disabled={busy}>{asAdmin ? 'Save payment' : 'Mark as paid'}</button></div>
    </form>
  );
}
