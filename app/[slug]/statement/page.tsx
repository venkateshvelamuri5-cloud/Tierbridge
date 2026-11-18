'use client';
import { counts, sum, useSociety } from '@/lib/society';
import { addMonths, dateLabel, inr, monthLabel, todayISO, waLink } from '@/lib/format';
import { Badge, FileLink, MonthPicker } from '@/components/ui';
import { methodText } from '@/components/PayForm';

export default function Statement() {
  const s = useSociety();
  const m = s.month;
  const opening = s.balanceThrough(addMonths(m, -1));
  const coll = s.collectedIn(m);
  const exps = s.expensesIn(m).slice().sort((a, b) => a.spent_on.localeCompare(b.spent_on));
  const inT = sum(coll), outT = sum(exps), closing = opening + inT - outT;
  const unpaid = s.units.filter((u) => !counts(s.payFor(u.id, m)));
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${s.society.slug}` : '';
  const summary = `${s.society.name}: statement for ${monthLabel(m, true)}\nOpening balance: ${inr(opening)}\nCollected: ${inr(inT)} from ${coll.length} of ${s.units.length} flats\nSpent: ${inr(outT)}\n${exps.map((e) => `  • ${e.title}: ${inr(e.amount)}`).join('\n')}\nClosing balance: ${inr(closing)}\n${unpaid.length ? `Not yet paid: ${unpaid.map((u) => u.number).join(', ')}\n` : ''}Bills and details: ${url}`;

  function csv() {
    const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: any[][] = [['Statement', s.society.name, monthLabel(m, true)], [], ['Opening balance', opening], ['Collected', inT], ['Spent', outT], ['Closing balance', closing], [],
      ['Collections'], ['Flat', 'Status', 'Paid on', 'Method', 'UTR / reference', 'Amount'],
      ...s.units.map((u) => { const p = s.payFor(u.id, m); return [u.number, p ? p.status : 'unpaid', p?.paid_on || '', p?.method || '', p?.utr || p?.note || '', p && counts(p) ? p.amount : 0]; }),
      [], ['Expenses'], ['Date', 'Item', 'Category', 'Paid to/by', 'Amount'], ...exps.map((e) => [e.spent_on, e.title, e.category, e.paid_by || '', e.amount])];
    const blob = new Blob(['﻿' + lines.map((l) => l.map(q).join(',')).join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.society.slug}-statement-${m.slice(0, 7)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <>
      <div className="page-head no-print">
        <div><h1>Monthly statement</h1><p className="muted">A summary to share in the residents’ group or save as a PDF.</p></div>
        <MonthPicker value={m} onChange={s.setMonth} from={s.society.start_month} />
      </div>
      <div className="btn-row no-print" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={() => window.print()}>Save as PDF / print</button>
        <button className="btn" onClick={csv}>Download spreadsheet (CSV)</button>
        <a className="btn" target="_blank" rel="noopener" href={waLink('', summary)}>Share summary on WhatsApp</a>
      </div>
      <article className="panel">
        <h1 style={{ fontSize: '1.4rem' }}>{s.society.name}</h1>
        <p className="muted">Maintenance statement for {monthLabel(m, true)} · generated {dateLabel(todayISO())}</p>
        <div className="totals">
          <div>Opening balance<b className="num">{inr(opening)}</b></div><div>Collected<b className="num">{inr(inT)}</b></div>
          <div>Spent<b className="num">{inr(outT)}</b></div><div>Closing balance<b className="num">{inr(closing)}</b></div>
        </div>
        <h2>Collections ({coll.length} of {s.units.length} flats)</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Flat</th><th>Paid on</th><th>How</th><th>Status</th><th className="right">Amount</th></tr></thead>
          <tbody>{s.units.map((u) => { const p = s.payFor(u.id, m); return (
            <tr key={u.id}><td>{u.number}</td><td className="num">{p ? dateLabel(p.paid_on) : '—'}</td><td>{p ? methodText(p) : '—'}</td><td><Badge status={p ? p.status : 'unpaid'} /></td><td className="right num">{p && counts(p) ? inr(p.amount) : '—'}</td></tr>); })}</tbody>
          <tfoot><tr><td colSpan={4}>Total collected</td><td className="right num">{inr(inT)}</td></tr></tfoot>
        </table></div>
        <h2 style={{ marginTop: 20 }}>Expenses</h2>
        {exps.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Item</th><th>Category</th><th>Bill</th><th className="right">Amount</th></tr></thead>
            <tbody>{exps.map((e) => <tr key={e.id}><td className="num">{dateLabel(e.spent_on)}</td><td>{e.title}{e.paid_by && <div className="small muted">{e.paid_by}</div>}</td><td>{e.category}</td><td>{e.bill_path ? <FileLink path={e.bill_path} label="View" getUrl={s.fileUrl} /> : 'None'}</td><td className="right num">{inr(e.amount)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={4}>Total spent</td><td className="right num">{inr(outT)}</td></tr></tfoot>
          </table></div>
        ) : <p className="muted" style={{ marginTop: 8 }}>No expenses this month.</p>}
        {unpaid.length > 0 && <p style={{ marginTop: 16 }}><b>Not yet paid:</b> {unpaid.map((u) => u.number).join(', ')}</p>}
      </article>
    </>
  );
}
