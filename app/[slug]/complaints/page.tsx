'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { TICKET_CATEGORIES, timeLabel } from '@/lib/format';
import { Badge, Empty, FileLink, Modal, useRun, useToast } from '@/components/ui';

export default function Complaints() {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [raise, setRaise] = useState(false);
  const [kind, setKind] = useState<'issue' | 'grievance'>('issue');
  const [view, setView] = useState<any>(null);
  const [thread, setThread] = useState<any[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => { setItems(must(await db().rpc('complaints', { p_society: s.society.id })) as any[]); }, [s.society.id]);
  useEffect(() => { load().catch(() => setItems([])); }, [load]);
  const openThread = async (t: any) => { setView(t); setThread(null); setThread(must(await db().rpc('complaint_thread', { p_ticket: t.id })) as any[]); };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get('title') || '').trim();
    setErr('');
    if (!title) { setErr('Say in a few words what the problem is.'); return; }
    const file = f.get('photo') as File;
    await run(async () => {
      const photo = await s.upload(file && file.size ? file : null, 'complaints');
      must(await db().from('tickets').insert({ society_id: s.society.id, kind, category: String(f.get('category')), title, body: String(f.get('body') || '').trim(), photo_path: photo, anonymous: kind === 'grievance' && f.get('anonymous') === 'on' }));
      setRaise(false); toast(kind === 'issue' ? 'Issue raised' : 'Grievance sent to the admins'); await load();
    });
  }
  async function setStatus(t: any, status: string) {
    await run(async () => { must(await db().from('tickets').update({ status }).eq('id', t.id)); toast('Updated'); await load(); await openThread({ ...t, status }); });
  }
  async function reply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    const body = String(new FormData(form).get('body') || '').trim(); if (!body) return;
    await run(async () => { must(await db().from('ticket_updates').insert({ ticket_id: view.id, body })); form.reset(); await openThread(view); await load(); });
  }

  const shown = (items || []).filter((t) => filter === 'all' || t.status === 'open' || t.status === 'in_progress');
  return (
    <>
      <div className="page-head">
        <div><h1>Complaints and requests</h1><p className="muted">Issues are visible to every resident, so the same problem isn’t reported twice. Grievances go privately to the admins.</p></div>
        {s.writable && <button className="btn primary" onClick={() => { setErr(''); setKind('issue'); setRaise(true); }}>Raise a complaint</button>}
      </div>
      <section className="panel">
        <div className="seg" role="radiogroup" aria-label="Show">
          <label><input type="radio" checked={filter === 'open'} onChange={() => setFilter('open')} />Open</label>
          <label><input type="radio" checked={filter === 'all'} onChange={() => setFilter('all')} />All</label>
        </div>
        {items === null ? <p className="muted">Loading…</p> : shown.length ? (
          <ul className="list" style={{ marginTop: 8 }}>{shown.map((t) => (
            <li key={t.id} className="spread" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <button className="btn link" style={{ fontWeight: 700, textDecoration: 'none', fontSize: '1.02rem' }} onClick={() => openThread(t)}>{t.title}</button>
                <div className="small muted">{t.kind === 'grievance' ? 'Private grievance' : 'Issue'} · {t.category} · {t.raised_by}{t.unit_number ? `, flat ${t.unit_number}` : ''} · {timeLabel(t.created_at)}{t.replies ? ` · ${t.replies} repl${t.replies > 1 ? 'ies' : 'y'}` : ''}</div>
              </div>
              <Badge status={t.status} />
            </li>))}
          </ul>
        ) : <Empty>{filter === 'open' ? 'No open complaints.' : 'No complaints yet.'}</Empty>}
      </section>

      <Modal open={raise} onClose={() => setRaise(false)} title="Raise a complaint">
        <form onSubmit={submit} noValidate className="stack">
          <div className="seg" role="radiogroup" aria-label="Type">
            <label><input type="radio" checked={kind === 'issue'} onChange={() => setKind('issue')} />Issue (visible to all)</label>
            <label><input type="radio" checked={kind === 'grievance'} onChange={() => setKind('grievance')} />Grievance (private)</label>
          </div>
          <p className="small muted">{kind === 'issue' ? 'Something in the building that needs fixing, like a leak, a broken light or the lift.' : 'A concern for the admins only: about a neighbour, a vendor, or the accounts.'}</p>
          <label className="field"><span>Category</span><select name="category">{TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field"><span>What’s the problem?</span><input type="text" name="title" placeholder="e.g. Water leaking on the 3rd floor stairs" /></label>
          <label className="field"><span>Details</span><textarea name="body" /></label>
          <label className="field"><span>Photo <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="file" name="photo" accept="image/*" /></label>
          {kind === 'grievance' && <label className="check"><input type="checkbox" name="anonymous" /> <span>Don’t show my name or flat to the admins</span></label>}
          <p role="alert" className="err">{err}</p>
          <div className="btn-row"><button className="btn primary" type="submit" disabled={busy}>Send</button><button className="btn" type="button" onClick={() => setRaise(false)}>Cancel</button></div>
        </form>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title || ''}>
        {view && (
          <div className="stack">
            <div className="row"><Badge status={view.status} /><span className="small muted">{view.kind === 'grievance' ? 'Private grievance' : 'Issue'} · {view.category} · {view.raised_by}{view.unit_number ? `, flat ${view.unit_number}` : ''}</span></div>
            {view.body && <p style={{ whiteSpace: 'pre-line' }}>{view.body}</p>}
            <FileLink path={view.photo_path} label="View photo" getUrl={s.fileUrl} />
            <ul className="list">{(thread || []).map((x) => (
              <li key={x.id}><div className="log-time">{timeLabel(x.created_at)} · {x.author}</div>{x.new_status ? <i>Changed status to {String(x.new_status).replace('_', ' ')}</i> : <p style={{ whiteSpace: 'pre-line' }}>{x.body}</p>}</li>
            ))}</ul>
            {s.writable && (
              <>
                <form onSubmit={reply} className="stack"><label className="field"><span>Reply</span><textarea name="body" /></label><div><button className="btn" type="submit" disabled={busy}>Send reply</button></div></form>
                <div className="btn-row">
                  {s.isAdmin && view.status === 'open' && <button className="btn" disabled={busy} onClick={() => setStatus(view, 'in_progress')}>Mark in progress</button>}
                  {s.isAdmin && (view.status === 'open' || view.status === 'in_progress') && <button className="btn good" disabled={busy} onClick={() => setStatus(view, 'resolved')}>Mark resolved</button>}
                  {view.mine && view.status === 'resolved' && <button className="btn good" disabled={busy} onClick={() => setStatus(view, 'closed')}>Confirm it’s fixed</button>}
                  {(view.mine || s.isAdmin) && (view.status === 'resolved' || view.status === 'closed') && <button className="btn" disabled={busy} onClick={() => setStatus(view, 'open')}>Reopen</button>}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
