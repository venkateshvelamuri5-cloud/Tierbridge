'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSociety } from '@/lib/society';
import { dateLabel, inr, thisMonth, waLink } from '@/lib/format';

const sentKey = (id: string) => `tb-welcome-sent-${id}`;
const hideKey = (id: string) => `tb-setup-hidden-${id}`;
const read = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const write = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* private window */ } };

/** The message an admin posts in the society's WhatsApp group. */
export function useWelcomeMessage() {
  const s = useSociety();
  const st = s.society;
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${st.slug}` : '';
  const amounts = Array.from(new Set(s.units.map((u) => s.rateFor(u.id, thisMonth())).filter((a): a is number => a != null)));
  const amountLine = amounts.length === 1 ? `\nMaintenance: ${inr(amounts[0])} a month, due by the ${ordinal(st.due_day)} of each month. Pay from the Pay page${st.upi_id ? ` (UPI ID ${st.upi_id})` : ''} and mark it there with the UTR.` : '';
  return `Our society ${st.name} is now on Tierbridge, where every flat can see maintenance payments, expenses and notices.\n\nSign in at ${url}\nLogin ID: your flat number, then -owner or -tenant (for example 101-owner).\nFirst-time password: the same as your login ID. You'll be asked to choose your own.${amountLine}\n\nAfter signing in, please add your name and mobile number under My account.`;
}

/** Where an admin stands on the four things that make a new society usable. */
export function useSetup() {
  const s = useSociety();
  const id = s.society.id;
  const [sentHere, setSentHere] = useState(false);
  useEffect(() => { setSentHere(read(sentKey(id))); }, [id]);
  const othersIn = s.residents.some((r) => r.signed_in && r.user_id !== s.me?.user_id);
  const steps = {
    amount: s.rates.length > 0,
    upi: !!(s.society.upi_id || s.society.qr_path),
    welcome: sentHere || othersIn,
    admin: s.residents.filter((r) => r.is_admin && r.active).length > 1,
  };
  const markSent = () => { write(sentKey(id)); setSentHere(true); };
  return { steps, done: Object.values(steps).every(Boolean), readyToInvite: steps.amount && steps.upi, markSent };
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, alignItems: 'start' }}>
      <span aria-hidden style={{ width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
        background: done ? 'var(--brand)' : 'transparent', color: 'var(--brand-ink)', border: done ? 'none' : '1.5px solid var(--ink-3, rgba(16,35,48,.35))' }}>{done ? '✓' : ''}</span>
      <div style={done ? { color: 'var(--ink-2)' } : undefined}>{children}<span className="sr-only">{done ? ' (done)' : ' (to do)'}</span></div>
    </li>
  );
}

/** Home page: stays until all four steps are done, or the admin hides it. */
export function SetupChecklist({ firstVisit }: { firstVisit: boolean }) {
  const s = useSociety();
  const base = `/${s.society.slug}`;
  const msg = useWelcomeMessage();
  const { steps, done, readyToInvite, markSent } = useSetup();
  const [hidden, setHidden] = useState(true);
  useEffect(() => { setHidden(read(hideKey(s.society.id))); }, [s.society.id]);
  if (!s.isAdmin || !s.writable || done || (hidden && readyToInvite)) return null;
  const hide = () => { write(hideKey(s.society.id)); setHidden(true); };

  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="spread">
        <h2>{firstVisit ? `Welcome to Tierbridge. Your free month runs until ${dateLabel(s.society.trial_ends_on)}.` : 'Finish setting up your society'}</h2>
        {readyToInvite && <button className="btn small" onClick={hide}>Hide</button>}
      </div>
      <p className="muted" style={{ marginTop: 6 }}>Set up payments first, so residents can pay as soon as they sign in.</p>
      <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 12 }}>
        <Step done={steps.amount}><Link href={`${base}/settings`}>Set the monthly maintenance amount</Link></Step>
        <Step done={steps.upi}><Link href={`${base}/settings`}>Add your society’s UPI ID</Link>, so residents pay the right account</Step>
        <Step done={steps.welcome}>
          <a href={waLink('', msg)} target="_blank" rel="noopener" onClick={markSent}>Send the welcome message to your WhatsApp group</a>, with everyone’s login ID and first-time password
          {!readyToInvite && !steps.welcome && <div className="small muted">Best sent after the amount and UPI ID are set.</div>}
        </Step>
        <Step done={steps.admin}><Link href={`${base}/residents`}>Make another owner an admin</Link>, so you’re not the only one verifying payments</Step>
      </ol>
    </section>
  );
}

/** Settings page: once payments are set up, prompt the admin to invite residents. */
export function InviteResidentsPrompt() {
  const s = useSociety();
  const msg = useWelcomeMessage();
  const { steps, readyToInvite, markSent } = useSetup();
  if (!s.isAdmin || !s.writable || !readyToInvite || steps.welcome) return null;
  return (
    <section className="panel" style={{ marginBottom: 16, borderColor: 'var(--brand)' }}>
      <div className="spread">
        <div><h2>Payments are set up. Now invite your residents.</h2>
          <p className="muted" style={{ marginTop: 4 }}>Post one message in your society’s WhatsApp group. It has the sign-in link, how login IDs work, the first-time password and this month’s maintenance.</p></div>
        <a className="btn primary" href={waLink('', msg)} target="_blank" rel="noopener" onClick={markSent}>Send welcome message on WhatsApp</a>
      </div>
      <details style={{ marginTop: 12 }}><summary className="small">See the message</summary><p className="note small" style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{msg}</p></details>
    </section>
  );
}
