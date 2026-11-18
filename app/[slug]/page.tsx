'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { counts, sum, useSociety } from '@/lib/society';
import { addMonths, inr, monthLabel, monthsBetween, thisMonth, timeLabel, dateLabel } from '@/lib/format';
import { db } from '@/lib/supabase';
import { MonthPicker } from '@/components/ui';
import { Building } from '@/components/Building';
import { InOutChart } from '@/components/Chart';
import { SetupChecklist } from '@/components/SetupChecklist';

export default function Home() {
  const s = useSociety();
  const m = s.month;
  const base = `/${s.society.slug}`;
  const [log, setLog] = useState<any[] | null>(null);
  const [notices, setNotices] = useState<any[] | null>(null);
  const [welcome, setWelcome] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('welcome') === '1') setWelcome(true); }, []);

  useEffect(() => {
    const c = db();
    c.from('notices').select('id,title,pinned,created_at,expires_on').eq('society_id', s.society.id)
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4)
      .then(({ data }) => setNotices((data || []).filter((n) => !n.expires_on || n.expires_on >= new Date().toISOString().slice(0, 10))));
    if (s.isAdmin) c.from('activity_log').select('*').eq('society_id', s.society.id).order('at', { ascending: false }).limit(6).then(({ data }) => setLog(data || []));
  }, [s.society.id, s.isAdmin]);

  const paid = s.units.filter((u) => counts(s.payFor(u.id, m))).length;
  const verified = s.units.filter((u) => s.statusOf(u.id, m) === 'verified').length;
  const coll = sum(s.collectedIn(m)), spent = sum(s.expensesIn(m)), expected = s.expectedIn(m);
  const bal = s.balanceThrough(thisMonth()), unv = sum(s.payments.filter((p) => p.status === 'marked'));
  const cats: Record<string, number> = {}; s.expensesIn(m).forEach((e) => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
  const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]); const catMax = Math.max(1, ...catList.map((c) => c[1]));
  const months = monthsBetween(addMonths(thisMonth(), -5), thisMonth());
  const myStatus = s.me ? s.statusOf(s.me.unit_id, thisMonth()) : null;
  const pendingPay = s.payments.filter((p) => p.status === 'marked').length;
  const pendingExp = s.expenses.filter((e) => e.status === 'pending').length;

  return (
    <>
      <SetupChecklist firstVisit={welcome} />
      {!s.rates.length && !s.isAdmin && <p className="note" style={{ marginBottom: 16 }}>The admins haven’t set the maintenance amount yet.</p>}
      {myStatus && (myStatus === 'unpaid' || myStatus === 'rejected') && s.rates.length > 0 && (
        <p className="note spread" style={{ marginBottom: 16 }}><span>Flat {s.unitById(s.me!.unit_id)?.number}’s maintenance for {monthLabel(thisMonth(), true)} isn’t marked as paid yet.</span><Link className="btn primary small" href={`${base}/pay`}>Pay now</Link></p>
      )}
      {s.isAdmin && (pendingPay > 0 || pendingExp > 0) && (
        <p className="note" style={{ marginBottom: 16 }}>Waiting for you: {pendingPay > 0 && <Link href={`${base}/payments`}>{pendingPay} payment{pendingPay > 1 ? 's' : ''} to verify</Link>}{pendingPay > 0 && pendingExp > 0 && ' and '}{pendingExp > 0 && <Link href={`${base}/expenses`}>{pendingExp} expense{pendingExp > 1 ? 's' : ''} to approve</Link>}.</p>
      )}
      <section className="panel">
        <div className="spread" style={{ alignItems: 'flex-end' }}>
          <div><p className="muted">{monthLabel(m, true)}</p><p className="hero-count">{paid} of {s.units.length} flats paid <small>{verified} verified by an admin</small></p></div>
          <MonthPicker value={m} onChange={s.setMonth} from={s.society.start_month} />
        </div>
        <div className="building-wrap" style={{ marginTop: 16 }}>
          <Building month={m} />
          <div>
            <dl className="ledger">
              <div className="total"><dt>Society fund balance today</dt><dd className="num">{inr(bal)}{unv > 0 && <span className="sub">includes {inr(unv)} not yet verified</span>}</dd></div>
              <div><dt>Collected in {monthLabel(m)}</dt><dd className="num">{inr(coll)}{expected > 0 && <span className="sub">of {inr(expected)} due</span>}</dd></div>
              <div><dt>Spent in {monthLabel(m)}</dt><dd className="num">{inr(spent)}</dd></div>
            </dl>
            <h3 style={{ marginTop: 20 }}>Where the money went in {monthLabel(m)}</h3>
            {catList.length ? (
              <>
                <ul className="catbars">{catList.map(([c, v]) => <li key={c}><span>{c}</span><span className="track"><span className="fill" style={{ width: `${(v / catMax) * 100}%` }} /></span><span className="num">{inr(v)}</span></li>)}</ul>
                <p style={{ marginTop: 8 }}><Link href={`${base}/expenses`}>See every bill</Link></p>
              </>
            ) : <p className="muted" style={{ marginTop: 8 }}>No expenses recorded for this month yet.</p>}
          </div>
        </div>
      </section>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <section className="panel"><h2>Collected and spent, last 6 months</h2><InOutChart data={months.map((mm) => ({ m: mm, inn: sum(s.collectedIn(mm)), out: sum(s.expensesIn(mm)) }))} /></section>
        <div>
          <section className="panel">
            <div className="spread"><h2>Notices</h2><Link href={`${base}/notices`} className="small">All notices</Link></div>
            {notices === null ? <p className="muted">Loading…</p> : notices.length ? (
              <ul className="list">{notices.map((n) => <li key={n.id}><Link href={`${base}/notices`} style={{ fontWeight: 600 }}>{n.title}</Link> {n.pinned && <span className="badge brand">Pinned</span>}<div className="log-time">{dateLabel(n.created_at)}</div></li>)}</ul>
            ) : <p className="empty">No notices yet.</p>}
          </section>
          {s.isAdmin && (
            <section className="panel">
              <div className="spread"><h2>Latest activity</h2><Link href={`${base}/activity`} className="small">Full log</Link></div>
              {log === null ? <p className="muted">Loading…</p> : log.length ? (
                <ul className="list">{log.map((l) => <li key={l.id}><div className="log-time">{timeLabel(l.at)}</div><div><b>{l.actor_name}</b> · {l.summary}</div></li>)}</ul>
              ) : <p className="empty">Nothing has happened yet.</p>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
