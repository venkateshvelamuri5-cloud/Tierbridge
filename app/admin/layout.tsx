'use client';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { db } from '@/lib/supabase';
import { loginEmail, PLATFORM_SLUG } from '@/lib/config';
import { CenterCard, PasswordForm, SignIn } from '@/components/auth';
import { Logo } from '@/components/Logo';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'signin' | 'denied' | 'ready'>('loading');
  const [changePw, setChangePw] = useState(false);
  const path = usePathname();

  const load = useCallback(async () => {
    const c = db();
    const { data: { session } } = await c.auth.getSession();
    if (!session) { setState('signin'); return; }
    const { data } = await c.from('platform_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    setState(data ? 'ready' : 'denied');
  }, []);
  useEffect(() => { load(); }, [load]);
  const signOut = async () => { await db().auth.signOut(); load(); };

  if (state === 'loading') return <p className="empty" style={{ paddingTop: 80 }}>Loading…</p>;
  if (state === 'signin') return <SignIn title="Tierbridge team" subtitle="Sign in to manage societies, trials and subscriptions." hint="Your Tierbridge team login ID." toEmail={(id) => loginEmail(PLATFORM_SLUG, id)} onSignedIn={load} />;
  if (state === 'denied') return <CenterCard><h1>Tierbridge team only</h1><p className="muted">You’re signed in with a society login. Sign out to sign in as the Tierbridge team.</p><button className="btn primary" onClick={signOut}>Sign out</button></CenterCard>;

  const tabs = [{ href: '/admin', label: 'Societies' }, { href: '/admin/new', label: 'New society' }, { href: '/admin/leads', label: 'Registrations' }, { href: '/admin/log', label: 'Console log' }];
  return (
    <>
      <header className="topnav"><div className="glass bar">
        <Link href="/admin" className="brand"><Logo /> <span>Tierbridge<br /><small>Super admin console</small></span></Link>
        <button className="btn small" onClick={() => setChangePw(!changePw)}>Change password</button>
        <button className="btn small" onClick={signOut}>Sign out</button>
      </div></header>
      <nav className="tabs" aria-label="Console"><div className="glass bar">
        {tabs.map((t) => <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>{t.label}</Link>)}
      </div></nav>
      <main className="wrap">
        {changePw && <section className="panel" style={{ maxWidth: 480, marginBottom: 16 }}><h2>Change your password</h2><div style={{ marginTop: 12 }}><PasswordForm onDone={() => setChangePw(false)} /></div></section>}
        {children}
      </main>
    </>
  );
}
