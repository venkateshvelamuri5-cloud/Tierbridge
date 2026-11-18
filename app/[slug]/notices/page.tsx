'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, must } from '@/lib/supabase';
import { dateLabel, timeLabel, todayISO, waLink } from '@/lib/format';
import { Empty, FileLink, Modal, useRun, useToast } from '@/components/ui';

export default function Notices() {
  const s = useSociety();
  const toast = useToast();
  const { busy, run } = useRun();
  const [items, setItems] = useState<any[] | null>(null);
  const [reads, setReads] = useState<Record<string, number>>({});
  const [showOld, setShowOld] = useState(false);
  const [form, setForm] = useState<{ open: boolean; n?: any }>({ open: false });
  const [err, setErr] = useState('');
  const url = typeof window !== 'undefined' ? `${window.location.origin}/${s.society.slug}/notices` : '';

  const load = useCallback(async () => {
    const c = db();
    const list = must(await c.from('notices').select('*').eq('society_id', s.society.id).order('pinned', { ascending: false }).order('created_at', { ascending: false })) as any[];
    setItems(list);
    if (list.length) {
      const r = must(await c.from('notice_reads').select('notice_id,user_id').in('notice_id', list.map((n) => n.id))) as any[];
      const counts: Record<string, number> = {}; r.forEach((x) => { counts[x.notice_id] = (counts[x.notice_id] || 0) + 1; }); setReads(counts);
      if (s.me) {
        const mine = new Set(r.filter((x) => x.user_id === s.me!.user_id).map((x) => x.notice_id));
        const unread = list.filter((n) => !mine.has(n.id));
        if (unread.length) await c.from('notice_reads').insert(unread.map((n) => ({ notice_id: n.id, user_id: s.me!.user_id })));
      }
    }
  }, [s.society.id, s.me]);
  useEffect(() => { load().catch(() => setItems([])); }, [load]);

  const today = todayISO();
  const current = (items || []).filter((n) => !n.expires_on || n.expires_on >= today);
  const old = (items || []).filter((n) => n.expires_on && n.expires_on < today);
  const activeCount = s.residents.filter((r) => r.active && r.signed_in).length;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const n = form.n;
    const title = String(f.get('title') || '').trim();
    setErr('');
    if (!title) { setErr('Give the notice a title.'); return; }
    const file = f.get('file') as File;
    await run(async () => {
      const path = await s.upload(file && file.size ? file : null, 'notices');
      const row: any = { society_id: s.society.id, title, body: String(f.get('body') || '').trim(), pinned: f.get('pinned') === 'on', expires_on: String(f.get('expires_on') || '') || null };
      if (path) row.attachment_path = path;
      if (n) must(await db().from('notices').update(row).eq('id', n.id)); else must(await db().from('notices').insert(row));
      setForm({ open: false }); toast(n ? 'Notice updated' : 'Notice posted'); await load();
    });
  }
  async function remove(n: any) {
    if (!window.confirm(`Remove the notice “${n.title}”? This can’t be undone, but it stays in the activity log.`)) return;
    await run(async () => { must(await db().from('notices').delete().eq('id', n.id)); toast('Notice removed'); await load(); });
  }

  const Card = ({ n }: { n: any }) => (
    <li>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3>{n.title} {n.pinned && <span className="badge brand">Pinned</span>}</h3>
          <div className="log-time">{timeLabel(n.created_at)} · {s.who(n.created_by)}{n.expires_on ? ` · until ${dateLabel(n.expires_on)}` : ''}</div>
        </div>
        {s.isAdmin && <span className="small muted">Read by {reads[n.id] || 0} of {activeCount}</span>}
      </div>
      {n.body && <p style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{n.body}</p>}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <FileLink path={n.attachment_path} label="Open attachment" getUrl={s.fileUrl} />
        <a className="btn small" target="_blank" rel="noopener" href={waLink('', `${s.society.name} notice: ${n.title}\n\n${n.body}\n\n${url}`)}>Share on WhatsApp</a>
        {s.isAdmin && s.writable && <><button className="btn small" onClick={() => { setErr(''); setForm({ open: true, n }); }}>Edit</button><button className="btn danger small" disabled={busy} onClick={() => remove(n)}>Remove</button></>}
      </div>
    </li>
  );

  const n = form.n || {};
  return (
    <>
      <div className="page-head">
        <div><h1>Notice board</h1><p className="muted">Announcements from the society’s admins.</p></div>
        {s.isAdmin && s.writable && <button className="btn primary" onClick={() => { setErr(''); setForm({ open: true }); }}>Post a notice</button>}
      </div>
      <section className="panel">
        {items === null ? <p className="muted">Loading…</p> : current.length ? <ul className="list">{current.map((x) => <Card key={x.id} n={x} />)}</ul> : <Empty>No notices right now.</Empty>}
      </section>
      {old.length > 0 && (
        <section className="panel"><button className="btn link" onClick={() => setShowOld(!showOld)}>{showOld ? 'Hide' : 'Show'} expired notices ({old.length})</button>
          {showOld && <ul className="list">{old.map((x) => <Card key={x.id} n={x} />)}</ul>}</section>
      )}
      <Modal open={form.open} onClose={() => setForm({ open: false })} title={form.n ? 'Edit notice' : 'Post a notice'}>
        <form onSubmit={save} noValidate className="stack" key={n.id || 'new'}>
          <label className="field"><span>Title</span><input type="text" name="title" defaultValue={n.title || ''} placeholder="e.g. Water supply off on Tuesday, 10 am to 2 pm" /></label>
          <label className="field"><span>Details</span><textarea name="body" defaultValue={n.body || ''} /></label>
          <label className="field"><span>Photo or PDF <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="file" name="file" accept="image/*,application/pdf" /></label>
          <div className="form-grid two">
            <label className="field"><span>Show until <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span><input type="date" name="expires_on" defaultValue={n.expires_on || ''} min={todayISO()} /></label>
            <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" name="pinned" defaultChecked={!!n.pinned} /> Pin to the top</label>
          </div>
          <p role="alert" className="err">{err}</p>
          <div className="btn-row"><button className="btn primary" type="submit" disabled={busy}>{form.n ? 'Save changes' : 'Post notice'}</button><button className="btn" type="button" onClick={() => setForm({ open: false })}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
