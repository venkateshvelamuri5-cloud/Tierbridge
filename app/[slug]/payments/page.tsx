'use client';
import { FormEvent, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { dateLabel, inr, monthLabel } from '@/lib/format';
import { Badge, FileLink, Modal, MonthPicker, useRun, useToast } from '@/components/ui';
import { PayForm, methodText } from '@/components/PayForm';

export default function Payments() {
  const s = useSociety();
  const m = s.month;
  const toast = useToast();
  const { busy, run } = useRun();
  const [reject, setReject] = useState<any>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const adm = s.isAdmin && s.writable;
  const waiting = s.payments.filter((p) => p.status === 'marked' && p.month !== m).sort((a, b) => a.month.localeCompare(b.month));
  const nameOf = (unitId: string) => {
    const u = s.unitById(unitId); const r = s.residents.find((x) => x.unit_id === unitId && x.role === (u?.has_tenant ? 'tenant' : 'owner'));
    return r?.full_name || '';
  };

  async function verify(id: string) {
    await run(async () => { must(await db().from('payments').update({ status: 'verified', review_note: null }).eq('id', id)); toast('Payment verified'); await s.refresh(); });
  }
  async function doReject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const why = String(new FormData(e.currentTarget).get('why') || '').trim();
    if (!why) { toast('Add a short reason so the flat knows what to fix.', true); return; }
    await run(async () => { must(await db().from('payments').update({ status: 'rejected', review_note: why }).eq('id', reject.id)); setReject(null); toast('Marked as not paid'); await s.refresh(); });
  }

  return (
    <>
      <div className="page-head"><div><h1>Payments</h1><p className="muted">Who has paid for {monthLabel(m, true)}, how, and the reference they gave.</p></div><MonthPicker value={m} onChange={s.setMonth} from={s.society.start_month} /></div>
      {s.isAdmin && waiting.length > 0 && (
        <p className="note" style={{ marginBottom: 16 }}>Also awaiting your check from other months: {waiting.map((p, i) => <span key={p.id}>{i > 0 && ', '}<button className="btn link" onClick={() => s.setMonth(p.month)}>{s.unitById(p.unit_id)?.number} · {monthLabel(p.month)}</button></span>)}</p>
      )}
      <section className="panel"><ul className="pay-rows">
        {s.units.map((u) => {
          const p = s.payFor(u.id, m); const st = p ? p.status : 'unpaid'; const name = nameOf(u.id);
          return (
            <li key={u.id}>
              <div className="flatno">{u.number}</div>
              <div>
                <Badge status={st} /> {name && <span className="small muted">{name}</span>}
                {p && <div className="small" style={{ marginTop: 4 }}>{methodText(p)} · paid {dateLabel(p.paid_on)} · marked by {s.who(p.marked_by)}{p.reviewed_by ? ` · ${p.status === 'verified' ? 'verified' : 'checked'} by ${s.who(p.reviewed_by)}` : ''}</div>}
                {p?.review_note && <div className="small muted">{p.review_note}</div>}
              </div>
              <div className="num right">{p ? inr(p.amount) : <span className="muted">{s.rateFor(u.id, m) ? inr(s.rateFor(u.id, m)) : ''}</span>}</div>
              <div className="actions">
                {p && <FileLink path={p.screenshot_path} label="View screenshot" getUrl={s.fileUrl} />}
                {adm && (p ? (
                  <>
                    {p.status !== 'verified' && <button className="btn good small" disabled={busy} onClick={() => verify(p.id)}>Verify</button>}
                    {p.status !== 'rejected' && <button className="btn danger small" onClick={() => setReject(p)}>Mark not paid</button>}
                    <button className="btn small" onClick={() => setEdit(u.id)}>Edit</button>
                  </>
                ) : <button className="btn small" onClick={() => setEdit(u.id)}>Record payment</button>)}
              </div>
            </li>
          );
        })}
      </ul></section>
      <Modal open={!!reject} onClose={() => setReject(null)} title={reject ? `Mark flat ${s.unitById(reject.unit_id)?.number} as not paid?` : ''}>
        <form onSubmit={doReject} className="stack">
          <p className="muted">The flat will show as “Not received” and the residents can mark it again with the correct details. This is recorded in the activity log.</p>
          <label className="field"><span>Reason</span><input type="text" name="why" required placeholder="e.g. No credit with this UTR in the society account" /></label>
          <div className="btn-row"><button className="btn danger" type="submit" disabled={busy}>Mark not paid</button><button className="btn" type="button" onClick={() => setReject(null)}>Cancel</button></div>
        </form>
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${s.payFor(edit, m) ? 'Edit' : 'Record'} payment · flat ${s.unitById(edit)?.number}` : ''}>
        <p className="small muted">Saved as verified. Use this for cash handed to you, or to correct a resident’s entry.</p>
        {edit && <PayForm unitId={edit} months={[m]} selected={m} asAdmin existing={s.payFor(edit, m)} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  );
}
