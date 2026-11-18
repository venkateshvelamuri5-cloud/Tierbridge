'use client';
import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { counts, useSociety } from '@/lib/society';
import { addMonths, dateLabel, inr, monthLabel, thisMonth } from '@/lib/format';
import { Badge, Empty, FileLink, Modal, useToast } from '@/components/ui';
import { PayForm, methodText } from '@/components/PayForm';

function upiLink(upi: string, payee: string, amount: number | null, note: string) {
  const q = new URLSearchParams({ pa: upi, pn: payee, cu: 'INR' });
  if (amount) q.set('am', amount.toFixed(2));
  q.set('tn', note.slice(0, 50));
  return 'upi://pay?' + q.toString().replace(/\+/g, '%20');
}

export default function Pay() {
  const s = useSociety();
  if (!s.me) return <Empty>The Tierbridge team account isn’t linked to a flat.</Empty>;
  return <PayInner />;
}

function PayInner() {
  const s = useSociety();
  const toast = useToast();
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [fix, setFix] = useState<string | null>(null);
  const unitId = s.me!.unit_id;
  const unit = s.unitById(unitId)!;
  const months = s.trackedMonths().concat([addMonths(thisMonth(), 1)]);
  const open = months.filter((m) => !counts(s.payFor(unitId, m)));
  const target = open.find((m) => m <= thisMonth()) || open[0] || thisMonth();
  const amount = s.rateFor(unitId, target);
  const note = `Maintenance ${unit.number} ${monthLabel(target)}`;
  const st = s.society;
  const link = st.upi_id ? upiLink(st.upi_id, st.payee_name || st.name, amount, note) : null;
  const svg = useMemo(() => { if (!link) return ''; const q = qrcode(0, 'M'); q.addData(link); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }, [link]);
  useEffect(() => { if (st.qr_path) s.fileUrl(st.qr_path).then(setQrImg).catch(() => setQrImg(null)); }, [st.qr_path]); // eslint-disable-line
  const hist = s.payments.filter((p) => p.unit_id === unitId).sort((a, b) => b.month.localeCompare(a.month));
  const due = open.filter((m) => m <= thisMonth()).length;

  return (
    <>
      <div className="page-head"><div><h1>Pay maintenance</h1><p className="muted">Flat {unit.number} · {due ? `${due} month${due > 1 ? 's' : ''} due` : 'All paid up'}</p></div></div>
      <div className="grid-2">
        <section className="panel stack">
          <h2>1. Pay the society</h2>
          {st.upi_id ? (
            <div className="paybox">
              <div className="qr">{qrImg ? <img src={qrImg} alt="Society UPI QR code" /> : <span dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', height: '100%', display: 'block' }} />}</div>
              <div className="stack">
                <div><p className="small muted">Amount for {monthLabel(target, true)}</p><p className="amount-big num">{amount ? inr(amount) : '—'}</p></div>
                <div><p className="small muted">UPI ID</p><p style={{ fontWeight: 700, wordBreak: 'break-all' }}>{st.upi_id}</p>{st.payee_name && <p className="small muted">{st.payee_name}</p>}</div>
                <div className="btn-row">{link && <a className="btn primary" href={link}>Open UPI app</a>}<button className="btn" onClick={() => navigator.clipboard.writeText(st.upi_id!).then(() => toast('UPI ID copied'))}>Copy UPI ID</button></div>
                <p className="small muted">Scan the QR with any UPI app, or tap “Open UPI app” on your phone. Add “{note}” as the note.</p>
              </div>
            </div>
          ) : <p className="muted">The admins haven’t added the society’s UPI ID yet. You can still pay by cash and mark it.</p>}
        </section>
        <section className="panel">
          <h2>2. Mark it as paid</h2>
          {!s.writable ? <p className="muted" style={{ marginTop: 12 }}>The society is read-only at the moment.</p>
            : open.length ? <PayForm key={target} unitId={unitId} months={open} selected={target} asAdmin={false} />
              : <p className="muted" style={{ marginTop: 12 }}>Every month so far is marked as paid. Thank you!</p>}
        </section>
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Flat {unit.number} payment history</h2>
        {hist.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Month</th><th>Status</th><th className="right">Amount</th><th>Paid on</th><th>How</th><th>Marked by</th><th></th></tr></thead>
            <tbody>{hist.map((p) => (
              <tr key={p.id}>
                <td>{monthLabel(p.month, true)}</td>
                <td><Badge status={p.status} />{p.review_note && <div className="small muted">{p.review_note}</div>}</td>
                <td className="right num">{inr(p.amount)}</td><td className="num">{dateLabel(p.paid_on)}</td><td>{methodText(p)}</td>
                <td className="small">{s.who(p.marked_by)}</td>
                <td><div className="btn-row"><FileLink path={p.screenshot_path} label="Screenshot" getUrl={s.fileUrl} />{p.status !== 'verified' && s.writable && <button className="btn small" onClick={() => setFix(p.month)}>{p.status === 'rejected' ? 'Mark again' : 'Edit'}</button>}</div></td>
              </tr>))}
            </tbody></table></div>
        ) : <Empty>No payments recorded for this flat yet.</Empty>}
      </section>
      <Modal open={!!fix} onClose={() => setFix(null)} title={fix ? `Payment for ${monthLabel(fix, true)}` : ''}>
        {fix && <PayForm unitId={unitId} months={[fix]} selected={fix} asAdmin={false} existing={s.payFor(unitId, fix)} onDone={() => setFix(null)} />}
      </Modal>
    </>
  );
}
