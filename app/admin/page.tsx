'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db, friendly, must } from '@/lib/supabase';
import { dateLabel, daysUntil, inr, timeLabel } from '@/lib/format';
import { PRICE_PER_FLAT } from '@/lib/config';
import { Badge, Empty, useToast } from '@/components/ui';

const FILTERS: Record<string, string> = { all: 'All societies', ending: 'Trials ending in 7 days', trial: 'On trial', active: 'Paid', read_only: 'Read-only', renewals: 'Renewals in 90 days' };

export default function Console() {
  const toast = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  useEffect(() => { db().rpc('platform_overview').then((r) => { try { setRows(must(r) as any[]); } catch (e) { toast(friendly(e), true); setRows([]); } }); }, [toast]);

  const list = useMemo(() => (rows || []).filter((r) => {
    if (q && !`${r.name} ${r.city} ${r.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'ending') return r.status === 'trial' && daysUntil(r.trial_ends_on) <= 7;
    if (filter === 'renewals') return r.status === 'active' && r.paid_until && daysUntil(r.paid_until) <= 90;
    if (filter === 'all') return true;
    return r.status === filter;
  }), [rows, filter, q]);

  const paying = (rows || []).filter((r) => r.status === 'active');
  const yearly = paying.reduce((a, r) => a + (r.fixed_amount != null ? Number(r.fixed_amount) : Number(r.flats) * Number(r.price_per_flat ?? PRICE_PER_FLAT) * (1 - Number(r.discount_pct || 0) / 100)), 0);
  const trials = (rows || []).filter((r) => r.status === 'trial');

  return (
    <>
      <div className="page-head"><div><h1>Societies</h1><p className="muted">Who signed up, who is using Tierbridge, and when trials and subscriptions end.</p></div><Link className="btn primary" href="/admin/new">New society</Link></div>
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="glass">Societies<b>{rows?.length ?? '…'}</b></div>
        <div className="glass">On trial<b>{trials.length}</b><span className="small muted">{trials.filter((r) => daysUntil(r.trial_ends_on) <= 7).length} ending this week</span></div>
        <div className="glass">Paying<b>{paying.length}</b><span className="small muted">{paying.reduce((a, r) => a + Number(r.flats), 0)} flats</span></div>
        <div className="glass">Yearly revenue<b>{inr(yearly)}</b><span className="small muted">from paying societies</span></div>
      </div>
      <section className="panel">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ minWidth: 220 }}><span>Show</span><select value={filter} onChange={(e) => setFilter(e.target.value)}>{Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="field" style={{ flex: 1, minWidth: 200 }}><span>Search</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city or web address" /></label>
        </div>
        {rows === null ? <p className="muted" style={{ marginTop: 12 }}>Loading…</p> : list.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}><table>
            <thead><tr><th>Society</th><th>Status</th><th>Trial ends / paid until</th><th className="right">Flats</th><th className="right">Signed in</th><th className="right">Payments, 30 days</th><th>Last activity</th><th>Admins</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/s/${r.id}`} style={{ fontWeight: 600 }}>{r.name}</Link><div className="small muted">{r.city} · /{r.slug}</div></td>
                <td><Badge status={r.status} />{r.discount_pct > 0 || r.fixed_amount != null ? <div className="small muted">custom price</div> : null}</td>
                <td className="num">{r.status === 'active' ? dateLabel(r.paid_until) : <>{dateLabel(r.trial_ends_on)}{r.status === 'trial' && <div className="small muted">{daysUntil(r.trial_ends_on)} days left</div>}</>}</td>
                <td className="right num">{r.flats}</td>
                <td className="right num">{r.signed_in} of {r.logins}</td>
                <td className="right num">{r.payments_30d}</td>
                <td className="small">{r.last_activity ? timeLabel(r.last_activity) : <span className="muted">None yet</span>}</td>
                <td className="small">{r.admin_names || <span className="muted">None</span>}{r.admin_phones && <div className="muted">{r.admin_phones}</div>}</td>
              </tr>))}</tbody>
          </table></div>
        ) : <Empty>No societies match.</Empty>}
      </section>
    </>
  );
}
