'use client';
import { counts, useSociety } from '@/lib/society';
import { inr, monthLabel, thisMonth, waLink } from '@/lib/format';
import { Empty } from '@/components/ui';

export default function Dues() {
  const s = useSociety();
  const months = s.trackedMonths();
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${s.society.slug}` : '';
  const due = s.units.map((u) => {
    const list = months.filter((m) => !counts(s.payFor(u.id, m)) && s.rateFor(u.id, m));
    return { unit: u, months: list, amount: list.reduce((a, m) => a + (s.rateFor(u.id, m) || 0), 0) };
  }).filter((d) => d.months.length);
  const total = due.reduce((a, d) => a + d.amount, 0);
  const msgFor = (d: typeof due[0]) => `Hi, this is a reminder from ${s.society.name}. Maintenance for flat ${d.unit.number} is pending for ${d.months.map((m) => monthLabel(m)).join(', ')} (total ${inr(d.amount)}). Please pay to UPI ID ${s.society.upi_id || '(ask an admin)'} and mark it as paid on Tierbridge: ${url}`;
  const group = `Maintenance status for ${monthLabel(thisMonth(), true)} (${s.society.name}):\n` +
    (due.length ? `Pending: ${due.map((d) => `${d.unit.number} (${d.months.length === 1 ? monthLabel(d.months[0]) : d.months.length + ' months'})`).join(', ')}` : 'All flats are paid up 🎉') +
    `\nPlease pay by the ${s.society.due_day}th and mark it on Tierbridge with your UTR: ${url}`;
  const contact = (unitId: string, hasTenant: boolean) => {
    const pick = s.residents.filter((r) => r.unit_id === unitId);
    return (pick.find((r) => r.role === (hasTenant ? 'tenant' : 'owner')) || pick.find((r) => r.role === 'owner'))?.phone || '';
  };
  return (
    <>
      <div className="page-head">
        <div><h1>Pending dues</h1><p className="muted">Flats that haven’t marked a payment, from {monthLabel(s.society.start_month, true)} to now. Maintenance is due by the {s.society.due_day}th of each month.</p></div>
        <a className="btn primary" target="_blank" rel="noopener" href={waLink('', group)}>Post reminder in WhatsApp group</a>
      </div>
      <section className="panel">
        {due.length ? (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>Flat</th><th>Months pending</th><th className="right">Amount</th><th></th></tr></thead>
              <tbody>{due.map((d) => {
                const phone = contact(d.unit.id, d.unit.has_tenant);
                return (
                  <tr key={d.unit.id}>
                    <td><b>{d.unit.number}</b></td>
                    <td>{d.months.map((m, i) => <span key={m}>{i > 0 && ', '}{monthLabel(m)}{s.statusOf(d.unit.id, m) === 'rejected' && <span className="badge bad" style={{ marginLeft: 4 }}>not received</span>}</span>)}</td>
                    <td className="right num">{inr(d.amount)}</td>
                    <td><a className="btn small" target="_blank" rel="noopener" href={waLink(phone, msgFor(d))}>{phone ? 'Remind on WhatsApp' : 'Share reminder'}</a></td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr><td colSpan={2}>{due.length} flat{due.length > 1 ? 's' : ''} pending</td><td className="right num">{inr(total)}</td><td></td></tr></tfoot>
            </table></div>
            <p className="small muted" style={{ marginTop: 12 }}>“Remind on WhatsApp” opens a chat with the flat’s saved number (the tenant’s if the flat is rented). Residents add their numbers under My account.</p>
          </>
        ) : <Empty>Every flat is paid up. 🎉</Empty>}
      </section>
    </>
  );
}
