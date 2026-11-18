'use client';
import { FormEvent, useState } from 'react';
import { sum, useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { CATEGORIES, dateLabel, inr, monthLabel, monthOf, todayISO } from '@/lib/format';
import { Badge, Empty, FileLink, Modal, MonthPicker, useRun, useToast } from '@/components/ui';

export default function Expenses() {
  const s = useSociety();
  const m = s.month;
  const toast = useToast();
  const { busy, run } = useRun();
  const [form, setForm] = useState<{ open: boolean; ex?: any }>({ open: false });
  const [rej, setRej] = useState<any>(null);
  const [err, setErr] = useState('');
  const adm = s.isAdmin;
  const approved = s.expensesIn(m), pending = s.expenses.filter((e) => e.status === 'pending'), rejected = s.expensesIn(m, 'rejected');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const ex = form.ex; const editing = !!ex;
    const billRequired = adm && !editing;
    const file = f.get('bill') as File;
    setErr('');
    if (!String(f.get('title') || '').trim()) { setErr('Say what the expense was for.'); return; }
    if (!(Number(f.get('amount')) > 0)) { setErr('Enter the amount.'); return; }
    if (billRequired && !(file && file.size)) { setErr('Attach a photo of the bill or receipt.'); return; }
    await run(async () => {
      const bill = await s.upload(file && file.size ? file : null, 'bills');
      const row: any = { society_id: s.society.id, title: String(f.get('title')).trim(), category: String(f.get('category')), amount: Number(f.get('amount')), spent_on: String(f.get('spent_on')), paid_by: String(f.get('paid_by') || '').trim() || null, notes: String(f.get('notes') || '').trim() || null };
      if (bill) row.bill_path = bill;
      if (editing) must(await db().from('expenses').update(row).eq('id', ex.id)); else must(await db().from('expenses').insert(row));
      setForm({ open: false }); toast(editing ? 'Expense updated' : adm ? 'Expense added' : 'Sent to the admins for approval');
      s.setMonth(monthOf(row.spent_on)); await s.refresh();
    });
  }
  async function approve(id: string) { await run(async () => { must(await db().from('expenses').update({ status: 'approved', review_note: null }).eq('id', id)); toast('Expense approved'); await s.refresh(); }); }
  async function doReject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const why = String(new FormData(e.currentTarget).get('why') || '').trim();
    if (!why) { toast('Add a reason.', true); return; }
    await run(async () => { must(await db().from('expenses').update({ status: 'rejected', review_note: why }).eq('id', rej.id)); setRej(null); toast('Expense rejected'); await s.refresh(); });
  }

  const Row = ({ e, actions }: { e: any; actions?: React.ReactNode }) => (
    <li className="spread" style={{ alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <b>{e.title}</b> <Badge status={e.status} />
        <div className="small muted">{e.category} · {dateLabel(e.spent_on)}{e.paid_by ? ` · paid to/by ${e.paid_by}` : ''}</div>
        <div className="small">Added by {s.who(e.submitted_by)}{e.reviewed_by && e.reviewed_by !== e.submitted_by ? ` · ${e.status === 'approved' ? 'approved' : 'reviewed'} by ${s.who(e.reviewed_by)}` : ''}</div>
        {e.notes && <div className="small muted">{e.notes}</div>}
        {e.review_note && <div className="small err">{e.review_note}</div>}
        <div className="btn-row" style={{ marginTop: 6 }}>{e.bill_path ? <FileLink path={e.bill_path} label="View bill" getUrl={s.fileUrl} /> : <span className="small muted">No bill attached</span>}{actions}</div>
      </div>
      <div className="num" style={{ fontWeight: 700 }}>{inr(e.amount)}</div>
    </li>
  );

  const ex = form.ex || {}; const editing = !!form.ex;
  return (
    <>
      <div className="page-head">
        <div><h1>Expenses</h1><p className="muted">Every rupee spent from the society fund, with its bill.</p></div>
        <div className="row" style={{ alignItems: 'flex-end' }}><MonthPicker value={m} onChange={s.setMonth} from={s.society.start_month} />{s.writable && <button className="btn primary" onClick={() => { setErr(''); setForm({ open: true }); }}>{adm ? 'Add expense' : 'Submit an expense'}</button>}</div>
      </div>
      {pending.length > 0 && (
        <section className="panel"><h2>Waiting for admin approval</h2><p className="small muted">Submitted by residents. These don’t count until an admin approves them.</p>
          <ul className="list">{pending.map((e) => <Row key={e.id} e={e} actions={adm && s.writable ? <><button className="btn good small" disabled={busy} onClick={() => approve(e.id)}>Approve</button><button className="btn danger small" onClick={() => setRej(e)}>Reject</button></> : null} />)}</ul></section>
      )}
      <section className="panel">
        <div className="spread"><h2>{monthLabel(m, true)}</h2><span className="num" style={{ fontWeight: 700 }}>Total {inr(sum(approved))}</span></div>
        {approved.length ? <ul className="list">{approved.map((e) => <Row key={e.id} e={e} actions={adm && s.writable ? <><button className="btn small" onClick={() => { setErr(''); setForm({ open: true, ex: e }); }}>Edit</button><button className="btn danger small" onClick={() => setRej(e)}>Cancel expense</button></> : null} />)}</ul> : <Empty>No expenses for this month yet.</Empty>}
      </section>
      {rejected.length > 0 && <section className="panel"><details><summary><b>Rejected or cancelled ({rejected.length})</b></summary><ul className="list">{rejected.map((e) => <Row key={e.id} e={e} />)}</ul></details></section>}

      <Modal open={form.open} onClose={() => setForm({ open: false })} title={editing ? 'Edit expense' : adm ? 'Add expense' : 'Submit an expense for approval'}>
        {!adm && <p className="small muted" style={{ marginBottom: 12 }}>For things you paid for the building yourself, like a small repair. An admin will check it before it counts.</p>}
        <form onSubmit={save} noValidate className="form-grid two" key={ex.id || 'new'}>
          <label className="field full"><span>What was it for?</span><input type="text" name="title" defaultValue={ex.title || ''} placeholder="e.g. Electricity bill, common area" /></label>
          <label className="field"><span>Category</span><select name="category" defaultValue={ex.category || (adm ? 'Electricity' : 'Repairs')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field"><span>Amount (₹)</span><input type="number" name="amount" min={1} step="0.01" inputMode="decimal" defaultValue={ex.amount || ''} /></label>
          <label className="field"><span>Date paid</span><input type="date" name="spent_on" defaultValue={ex.spent_on || todayISO()} max={todayISO()} /></label>
          <label className="field"><span>Paid to / by</span><input type="text" name="paid_by" defaultValue={ex.paid_by || ''} placeholder="e.g. APEPDCL, Ramesh (watchman)" /></label>
          <label className="field full"><span>Bill or receipt photo {!(adm && !editing) && <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}</span><input type="file" name="bill" accept="image/*,application/pdf" />
            {adm && !editing && <small>Required. Everyone can see the bill for every expense.</small>}</label>
          <label className="field full"><span>Notes</span><textarea name="notes" defaultValue={ex.notes || ''} /></label>
          <p role="alert" className="err full">{err}</p>
          <div className="btn-row full"><button className="btn primary" type="submit" disabled={busy}>{editing ? 'Save changes' : adm ? 'Add expense' : 'Submit for approval'}</button><button className="btn" type="button" onClick={() => setForm({ open: false })}>Cancel</button></div>
        </form>
      </Modal>
      <Modal open={!!rej} onClose={() => setRej(null)} title={rej ? `${rej.status === 'pending' ? 'Reject' : 'Cancel'} “${rej.title}”?` : ''}>
        <form onSubmit={doReject} className="stack">
          <p className="muted">It stays visible in the rejected list and the activity log, but no longer counts against the fund.</p>
          <label className="field"><span>Reason</span><input type="text" name="why" required /></label>
          <div className="btn-row"><button className="btn danger" type="submit" disabled={busy}>{rej?.status === 'pending' ? 'Reject expense' : 'Cancel expense'}</button><button className="btn" type="button" onClick={() => setRej(null)}>Keep it</button></div>
        </form>
      </Modal>
    </>
  );
}
