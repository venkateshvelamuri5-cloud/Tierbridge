'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSociety } from '@/lib/society';
import { db, friendly, must } from '@/lib/supabase';
import { timeLabel } from '@/lib/format';
import { Empty, useToast } from '@/components/ui';

const KINDS: Record<string, string[] | null> = {
  all: null, payment: ['payment'], expense: ['expense'], community: ['notice', 'ticket'], admin: ['member', 'society', 'rate', 'unit'],
};
const LABEL: Record<string, string> = { all: 'Everything', payment: 'Payments', expense: 'Expenses', community: 'Notices and complaints', admin: 'Admins, settings and passwords' };

export default function Activity() {
  const s = useSociety();
  const toast = useToast();
  const [kind, setKind] = useState('all');
  const [rows, setRows] = useState<any[] | null>(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const size = 100;

  const load = useCallback(async (p: number) => {
    let q = db().from('activity_log').select('*').eq('society_id', s.society.id).order('at', { ascending: false }).range(p * size, p * size + size - 1);
    const k = KINDS[kind]; if (k) q = q.in('entity', k);
    const data = must(await q) as any[];
    setRows((prev) => (p === 0 ? data : [...(prev || []), ...data])); setMore(data.length === size);
  }, [kind, s.society.id]);
  useEffect(() => { setPage(0); load(0).catch((e) => toast(friendly(e), true)); }, [load, toast]);

  if (!s.isAdmin) return <Empty>Only admins can see the activity log.</Empty>;
  return (
    <>
      <div className="page-head">
        <div><h1>Activity log</h1><p className="muted">Every payment, verification, expense, notice, complaint and admin change, with who did it and when. Only admins can see this page, and nobody can edit or delete these entries.</p></div>
        <label className="field" style={{ minWidth: 240 }}><span>Show</span><select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.keys(KINDS).map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}</select></label>
      </div>
      <section className="panel">
        {rows === null ? <p className="muted">Loading…</p> : rows.length ? (
          <ul className="list">{rows.map((l) => <li key={l.id}><div className="log-time">{timeLabel(l.at)}</div><div><b>{l.actor_name}</b> · {l.summary}</div></li>)}</ul>
        ) : <Empty>Nothing recorded yet.</Empty>}
        {more && <button className="btn" style={{ marginTop: 12 }} onClick={() => { const n = page + 1; setPage(n); load(n); }}>Show older</button>}
      </section>
    </>
  );
}
