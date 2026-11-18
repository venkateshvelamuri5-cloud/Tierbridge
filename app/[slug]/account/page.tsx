'use client';
import { FormEvent } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { Empty, useRun, useToast } from '@/components/ui';
import { PasswordForm } from '@/components/auth';

export default function Account() {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const me = s.me;
  if (!me) return <Empty>The Tierbridge team account has no flat details.</Empty>;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const phone = String(f.get('phone') || '').trim();
    if (phone && phone.replace(/\D/g, '').length < 10) { toast('Enter a 10-digit mobile number.', true); return; }
    await run(async () => {
      must(await db().from('members').update({ full_name: String(f.get('full_name') || '').trim() || null, phone: phone || null }).eq('user_id', me!.user_id));
      toast('Details saved'); await s.refresh();
    });
  }
  return (
    <>
      <div className="page-head"><div><h1>My account</h1><p className="muted">Signed in as <b>{me.login_id}</b>, flat {s.unitById(me.unit_id)?.number}.</p></div></div>
      <div className="grid-2">
        <section className="panel">
          <h2>Your details</h2>
          <form onSubmit={save} noValidate className="stack" style={{ marginTop: 12 }}>
            <label className="field"><span>Your name</span><input type="text" name="full_name" defaultValue={me.full_name || ''} autoComplete="name" /><small>Shown to other residents next to your flat.</small></label>
            <label className="field"><span>WhatsApp number</span><input type="tel" name="phone" defaultValue={me.phone || ''} autoComplete="tel" placeholder="10-digit mobile number" />
              <small>{s.society.phone_visibility === 'all' ? 'Everyone in the building can see it on the Residents page.' : 'Only admins can see it, for reminders.'}</small></label>
            <div><button className="btn primary" type="submit" disabled={busy}>Save details</button></div>
          </form>
        </section>
        <section className="panel"><h2>Change password</h2><div style={{ marginTop: 12 }}><PasswordForm onDone={() => {}} /></div></section>
      </div>
    </>
  );
}
