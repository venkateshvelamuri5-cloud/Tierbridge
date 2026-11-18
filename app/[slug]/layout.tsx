'use client';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/supabase';
import { loginEmail } from '@/lib/config';
import { loadSociety, SocietyProvider, useSociety } from '@/lib/society';
import { CenterCard, PasswordForm, SignIn } from '@/components/auth';
import { Logo } from '@/components/Logo';
import { daysUntil, dateLabel } from '@/lib/format';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'signin'; name: string }
  | { kind: 'other'; name: string }
  | { kind: 'password'; userId: string; loginId: string }
  | { kind: 'ready'; data: any; userId: string };

export default function SocietyLayout({ children, params }: { children: ReactNode; params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    const c = db();
    const pub = (await c.rpc('society_public', { p_slug: slug })).data?.[0];
    if (!pub) { setState({ kind: 'missing' }); return; }
    const { data: { session } } = await c.auth.getSession();
    if (!session) { setState({ kind: 'signin', name: pub.name }); return; }
    try {
      const data = await loadSociety(slug, session.user.id);
      if (data.me?.must_change_password) { setState({ kind: 'password', userId: session.user.id, loginId: data.me.login_id }); return; }
      setState({ kind: 'ready', data, userId: session.user.id });
    } catch {
      setState({ kind: 'other', name: pub.name });
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const signOut = async () => { await db().auth.signOut(); load(); };

  if (state.kind === 'loading') return <p className="empty" style={{ paddingTop: 80 }}>Loading…</p>;
  if (state.kind === 'missing') return (
    <CenterCard><h1>No society here</h1><p className="muted">There’s no society at this address. Check the link, or search from the <Link href="/">Tierbridge home page</Link>.</p></CenterCard>
  );
  if (state.kind === 'signin') return (
    <SignIn title={state.name} subtitle="Sign in to see payments, expenses and notices for your building."
      hint="Your flat number, then -owner or -tenant." toEmail={(id) => loginEmail(slug, id)} onSignedIn={load} />
  );
  if (state.kind === 'other') return (
    <CenterCard><h1>{state.name}</h1><p className="muted">You’re signed in with a login from another society. Sign out to sign in here.</p>
      <button className="btn primary" onClick={signOut}>Sign out</button></CenterCard>
  );
  if (state.kind === 'password') return (
    <CenterCard>
      <div><h1>Set your own password</h1><p className="muted" style={{ marginTop: 6 }}>You’re signed in as <b>{state.loginId}</b>. Choose a new password before you continue; the temporary one stops working.</p></div>
      <PasswordForm confirmFlag={{ userId: state.userId }} onDone={load} />
      <button className="btn link" onClick={signOut}>Sign out</button>
    </CenterCard>
  );
  return (
    <SocietyProvider initial={state.data} userId={state.userId}>
      <Shell onSignOut={signOut}>{children}</Shell>
    </SocietyProvider>
  );
}

function Shell({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const s = useSociety();
  const path = usePathname();
  const base = `/${s.society.slug}`;
  const pendingExp = s.expenses.filter((e) => e.status === 'pending').length;
  const tabs: { href: string; label: string; show?: boolean; badge?: number }[] = [
    { href: base, label: 'Home' },
    { href: `${base}/pay`, label: 'Pay', show: !!s.me },
    { href: `${base}/payments`, label: 'Payments' },
    { href: `${base}/expenses`, label: 'Expenses', badge: s.isAdmin ? pendingExp : 0 },
    { href: `${base}/dues`, label: 'Pending dues' },
    { href: `${base}/statement`, label: 'Statement' },
    { href: `${base}/notices`, label: 'Notices' },
    { href: `${base}/complaints`, label: 'Complaints' },
    { href: `${base}/residents`, label: 'Residents' },
    { href: `${base}/activity`, label: 'Activity log', show: s.isAdmin },
    { href: `${base}/settings`, label: 'Settings', show: s.isAdmin },
    { href: `${base}/account`, label: 'My account', show: !!s.me },
  ];
  const me = s.me;
  const role = s.isPlatform && !me ? 'Tierbridge team' : me ? `${me.role === 'owner' ? 'Owner' : 'Tenant'}, flat ${s.unitById(me.unit_id)?.number}${me.is_admin ? ' · Admin' : ''}` : '';
  const left = s.society.status === 'trial' ? daysUntil(s.society.trial_ends_on) : null;
  return (
    <>
      <header className="topnav">
        <div className="glass bar">
          <Link href={base} className="brand"><Logo /> <span>{s.society.name}<br /><small>on Tierbridge</small></span></Link>
          <div className="who"><b>{me?.full_name || me?.login_id || 'Tierbridge'}</b><br /><span className="muted">{role}</span></div>
          <button className="btn small" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        <div className="glass bar">
          {tabs.filter((t) => t.show !== false).map((t) => (
            <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>
              {t.label}{t.badge ? <span className="count">{t.badge}</span> : null}
            </Link>
          ))}
        </div>
      </nav>
      <main className="wrap">
        {!s.writable && (
          <p className="note bad" style={{ marginBottom: 16 }}>
            {s.society.name} is read-only: {s.society.status === 'trial' || s.society.status === 'read_only' ? 'the free trial has ended' : 'the subscription has lapsed'}. Everyone can still see the records, but nothing new can be added. {s.isAdmin ? <Link href={`${base}/settings#plan`}>Upgrade in Settings</Link> : 'Ask an admin to upgrade.'}
          </p>
        )}
        {s.writable && s.isAdmin && left !== null && left <= 10 && (
          <p className="note warn" style={{ marginBottom: 16 }}>
            Your free trial ends on {dateLabel(s.society.trial_ends_on)} ({left} day{left === 1 ? '' : 's'} left). <Link href={`${base}/settings#plan`}>See how to upgrade</Link>
          </p>
        )}
        {children}
      </main>
    </>
  );
}
