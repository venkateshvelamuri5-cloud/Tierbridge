'use client';
import { FormEvent, ReactNode, useState } from 'react';
import Link from 'next/link';
import { db, friendly, must } from '@/lib/supabase';
import { Logo } from './Logo';
import { useToast } from './ui';

export const normaliseLogin = (v: string) => {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/^([a-z0-9]+(?:-[a-z0-9]+)?)\s*[-_ ]?\s*(owner|tenant)$/);
  return m ? `${m[1].replace(/-$/, '')}-${m[2]}` : s.replace(/\s+/g, '');
};

export function CenterCard({ children }: { children: ReactNode }) {
  return <div className="center"><div className="glass card stack">{children}</div></div>;
}

export function SignIn({ title, subtitle, hint, toEmail, onSignedIn }: {
  title: string; subtitle: string; hint: string; toEmail: (id: string) => string; onSignedIn: () => void;
}) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = normaliseLogin(String(f.get('u') || '')); const pw = String(f.get('p') || '');
    if (!id || !pw) { setErr('Enter your login ID and password.'); return; }
    setBusy(true); setErr('');
    const { error } = await db().auth.signInWithPassword({ email: toEmail(id), password: pw });
    setBusy(false);
    if (error) { setErr(friendly(error)); return; }
    onSignedIn();
  }
  return (
    <CenterCard>
      <Link href="/" className="brand" style={{ marginRight: 0 }}><Logo /> Tierbridge</Link>
      <div><h1>{title}</h1><p className="muted" style={{ marginTop: 6 }}>{subtitle}</p></div>
      <form onSubmit={submit} noValidate className="stack">
        <label className="field"><span>Login ID</span><input name="u" type="text" autoComplete="username" autoCapitalize="none" placeholder="e.g. 101-owner" required /><small>{hint}</small></label>
        <label className="field"><span>Password</span><input name="p" type="password" autoComplete="current-password" required /></label>
        <p role="alert" className="err">{err}</p>
        <button className="btn primary" type="submit" disabled={busy}>Sign in</button>
      </form>
      <p className="small muted">Forgot your password? Ask one of your society’s admins to reset it.</p>
    </CenterCard>
  );
}

export function PasswordForm({ onDone, confirmFlag }: { onDone: () => void; confirmFlag?: { userId: string } }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const f = new FormData(form);
    const p1 = String(f.get('p1') || ''), p2 = String(f.get('p2') || '');
    if (p1.length < 8) { setErr('Use at least 8 characters.'); return; }
    if (p1 !== p2) { setErr('The two passwords don’t match.'); return; }
    setBusy(true); setErr('');
    try {
      must(await db().auth.updateUser({ password: p1 }) as any);
      if (confirmFlag) must(await db().from('members').update({ must_change_password: false }).eq('user_id', confirmFlag.userId));
      toast('Password saved'); form.reset(); onDone();
    } catch (e2) { setErr(friendly(e2)); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="stack">
      <label className="field"><span>New password</span><input name="p1" type="password" autoComplete="new-password" minLength={8} required /><small>At least 8 characters.</small></label>
      <label className="field"><span>Type it again</span><input name="p2" type="password" autoComplete="new-password" required /></label>
      <p role="alert" className="err">{err}</p>
      <button className="btn primary" type="submit" disabled={busy}>Save new password</button>
    </form>
  );
}
