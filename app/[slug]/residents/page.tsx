'use client';
import { FormEvent, useState } from 'react';
import { useSociety, Resident } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { randomPassword, waLink } from '@/lib/format';
import { Modal, useRun, useToast } from '@/components/ui';

export default function Residents() {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const [reset, setReset] = useState<Resident | null>(null);
  const [resetDone, setResetDone] = useState<{ login: string; pw: string } | null>(null);
  const [created, setCreated] = useState<any[] | null>(null);
  const [mode, setMode] = useState<'same' | 'random'>('same');
  const [onlyPending, setOnlyPending] = useState(false);
  const adm = s.isAdmin;
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${s.society.slug}` : '';
  const me = s.me;
  const missing = s.units.length * 2 - s.residents.length;
  const pending = s.residents.filter((r) => r.active && !r.signed_in).length;

  const toggleTenant = (unitId: string, has: boolean) => run(async () => { must(await db().from('units').update({ has_tenant: !has }).eq('id', unitId)); toast('Saved'); await s.refresh(); });
  const setPlan = (unitId: string, planId: string) => run(async () => { must(await db().from('units').update({ plan_id: planId || null }).eq('id', unitId)); toast('Plan updated'); await s.refresh(); });
  const toggleAdmin = (r: Resident) => run(async () => { must(await db().from('members').update({ is_admin: !r.is_admin }).eq('user_id', r.user_id)); toast(r.is_admin ? 'Admin role removed' : `${r.login_id} is now an admin`); await s.refresh(); });
  const toggleActive = (r: Resident) => run(async () => { must(await db().from('members').update({ active: !r.active }).eq('user_id', r.user_id)); toast(r.active ? 'Login turned off' : 'Login turned on'); await s.refresh(); });
  async function createLogins() {
    await run(async () => { const rows = must(await db().rpc('create_logins', { p_society: s.society.id, p_mode: mode })) as any[]; setCreated(rows); await s.refresh(); });
  }
  async function doReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const pw = String(new FormData(e.currentTarget).get('pw') || '');
    if (pw.length < 8) { toast('Use at least 8 characters.', true); return; }
    await run(async () => { must(await db().rpc('reset_password', { p_user: reset!.user_id, p_password: pw })); setResetDone({ login: reset!.login_id, pw }); setReset(null); await s.refresh(); });
  }
  function downloadSheet(rows: any[]) {
    const lines = [['Login ID', 'Flat', 'Role', 'Temporary password'], ...rows.map((r) => [r.login_id, r.unit_number, r.role, r.temp_password])];
    const blob = new Blob([lines.map((l) => l.map((v) => `"${v}"`).join(',')).join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.society.slug}-logins-PRIVATE.csv`; a.click();
  }
  const groupMsg = `Welcome to ${s.society.name} on Tierbridge, where every flat can see maintenance payments, expenses and notices.\n\nSign in at ${url}\nLogin ID: your flat number, then -owner or -tenant (for example 101-owner).\n${mode === 'same' || !created ? 'First-time password: the same as your login ID.' : 'Your first-time password has been sent to you separately.'}\nYou’ll be asked to choose your own password, then please add your name and mobile number under My account.`;

  const person = (r?: Resident) => r ? (
    <div>
      <b>{r.full_name || 'No name added'}</b> <span className="small muted">{r.login_id}</span>
      {r.is_admin && <span className="badge brand" style={{ marginLeft: 6 }}>Admin</span>}
      {!r.active && <span className="badge quiet" style={{ marginLeft: 6 }}>Login off</span>}
      {adm && r.active && !r.signed_in && <span className="badge warn" style={{ marginLeft: 6 }}>Not signed in yet</span>}
      {r.phone && <div className="small"><a href={`tel:${r.phone}`}>{r.phone}</a> · <a href={waLink(r.phone, 'Hi')} target="_blank" rel="noopener">WhatsApp</a></div>}
    </div>
  ) : <span className="muted small">No login</span>;

  const rows = s.units.filter((u) => !onlyPending || s.residents.some((r) => r.unit_id === u.id && r.active && !r.signed_in));
  return (
    <>
      <div className="page-head">
        <div><h1>Residents</h1><p className="muted">Owners and tenants of every flat{s.society.phone_visibility === 'all' ? ', with the phone numbers they’ve shared' : ''}. {s.society.phone_visibility === 'admins' && !adm ? 'Phone numbers are visible to admins only.' : ''}</p></div>
        {adm && pending > 0 && <label className="check"><input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Only flats not signed in yet ({pending} logins)</label>}
      </div>
      {adm && s.writable && missing > 0 && (
        <section className="panel">
          <h2>Create logins for {missing === s.units.length * 2 ? 'every flat' : `${missing} missing logins`}</h2>
          <p className="muted">Each flat gets an owner and a tenant login, like 101-owner and 101-tenant. Everyone sets their own password the first time they sign in.</p>
          <div className="seg" role="radiogroup" aria-label="Temporary passwords" style={{ marginTop: 12 }}>
            <label><input type="radio" checked={mode === 'same'} onChange={() => setMode('same')} />Same as login ID</label>
            <label><input type="radio" checked={mode === 'random'} onChange={() => setMode('random')} />Random per login</label>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{mode === 'same' ? 'Easiest: one WhatsApp group message tells everyone. Anyone who knows a flat number could sign in first, so check below for flats that haven’t signed in yet.' : 'Safer: download the sheet and send each flat its password separately.'}</p>
          <button className="btn primary" style={{ marginTop: 12 }} disabled={busy} onClick={createLogins}>Create logins</button>
        </section>
      )}
      <section className="panel">
        <div className="table-wrap"><table>
          <thead><tr><th>Flat</th><th>Owner</th><th>Tenant</th><th></th></tr></thead>
          <tbody>{rows.map((u) => {
            const o = s.residents.find((r) => r.unit_id === u.id && r.role === 'owner');
            const t = s.residents.find((r) => r.unit_id === u.id && r.role === 'tenant');
            const myFlatOwner = me?.role === 'owner' && me.unit_id === u.id;
            const plan = s.plans.find((p) => p.id === u.plan_id);
            return (
              <tr key={u.id}>
                <td><b>{u.number}</b><div className="small muted">{u.has_tenant ? 'Rented' : 'Owner-occupied'}{plan ? ` · ${plan.name}` : ''}</div>
                  {adm && s.writable && s.plans.length > 1 && <select aria-label={`Plan for flat ${u.number}`} value={u.plan_id || ''} onChange={(e) => setPlan(u.id, e.target.value)} style={{ marginTop: 6, minHeight: 36, padding: '4px 8px' }}><option value="">No plan</option>{s.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                </td>
                <td>{person(o)}</td>
                <td>{u.has_tenant || adm ? person(t) : <span className="muted small">—</span>}</td>
                <td><div className="btn-row">
                  {s.writable && (adm || myFlatOwner) && <button className="btn small" disabled={busy} onClick={() => toggleTenant(u.id, u.has_tenant)}>{u.has_tenant ? 'Mark owner-occupied' : 'Mark as rented'}</button>}
                  {s.writable && (adm || myFlatOwner) && t && <button className="btn small" onClick={() => setReset(t)}>Reset tenant password</button>}
                  {s.writable && adm && o && <button className="btn small" onClick={() => setReset(o)}>Reset owner password</button>}
                  {s.writable && adm && o && o.user_id !== me?.user_id && <button className="btn small" disabled={busy} onClick={() => toggleAdmin(o)}>{o.is_admin ? 'Remove admin' : 'Make admin'}</button>}
                  {s.writable && adm && t && <button className="btn small" disabled={busy} onClick={() => toggleActive(t)}>{t.active ? 'Turn off tenant login' : 'Turn on tenant login'}</button>}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>

      <Modal open={!!reset} onClose={() => setReset(null)} title={reset ? `Reset password for ${reset.login_id}` : ''}>
        <form onSubmit={doReset} className="stack" key={reset?.user_id}>
          <p className="muted">Give the new password to the person privately. They’ll be asked to choose their own when they sign in.{reset?.role === 'tenant' ? ' Do this when a tenant moves out.' : ''}</p>
          <label className="field"><span>Temporary password</span><input type="text" name="pw" defaultValue={randomPassword()} minLength={8} autoComplete="off" /></label>
          <div className="btn-row"><button className="btn primary" type="submit" disabled={busy}>Reset password</button><button className="btn" type="button" onClick={() => setReset(null)}>Cancel</button></div>
        </form>
      </Modal>
      <Modal open={!!resetDone} onClose={() => setResetDone(null)} title="Password reset">
        <p>Send this to the person privately:</p>
        <p className="note" style={{ margin: '12px 0' }}>Login ID: <b>{resetDone?.login}</b><br />Temporary password: <b>{resetDone?.pw}</b><br />{url}</p>
        <div className="btn-row"><a className="btn" target="_blank" rel="noopener" href={waLink('', `Your ${s.society.name} login on Tierbridge\nLogin ID: ${resetDone?.login}\nTemporary password: ${resetDone?.pw}\n${url}`)}>Send on WhatsApp</a><button className="btn primary" onClick={() => setResetDone(null)}>Done</button></div>
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title={`Created ${created?.length || 0} logins`}>
        <div className="stack">
          <p className="muted">Download the sheet and keep it private. Then post the welcome message in your society’s WhatsApp group.</p>
          <div className="btn-row">
            <button className="btn" onClick={() => created && downloadSheet(created)}>Download login sheet</button>
            <a className="btn primary" target="_blank" rel="noopener" href={waLink('', groupMsg)}>Post welcome message</a>
          </div>
          {mode === 'random' && created && created.length > 0 && (
            <details><summary>Send each flat its password</summary>
              <ul className="list">{created.map((r) => (
                <li key={r.login_id} className="spread"><span>{r.login_id} · <code>{r.temp_password}</code></span>
                  <a className="btn small" target="_blank" rel="noopener" href={waLink(s.residents.find((x) => x.login_id === r.login_id)?.phone || '', `Your ${s.society.name} login on Tierbridge\nLogin ID: ${r.login_id}\nTemporary password: ${r.temp_password}\n${url}`)}>Send on WhatsApp</a></li>
              ))}</ul>
            </details>
          )}
        </div>
      </Modal>
    </>
  );
}
