'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { timeLabel } from '@/lib/format';
import { Empty } from '@/components/ui';

export default function ConsoleLog() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const c = db();
    c.from('platform_log').select('*').order('at', { ascending: false }).limit(200).then(({ data }) => setRows(data || []));
    c.from('societies').select('id,name').then(({ data }) => { const m: Record<string, string> = {}; (data || []).forEach((s: any) => { m[s.id] = s.name; }); setNames(m); });
  }, []);
  return (
    <>
      <div className="page-head"><div><h1>Console log</h1><p className="muted">Every action taken in this console: societies created, trials extended, prices agreed and payments recorded.</p></div></div>
      <section className="panel">
        {rows === null ? <p className="muted">Loading…</p> : rows.length ? (
          <ul className="list">{rows.map((l) => <li key={l.id}><div className="log-time">{timeLabel(l.at)}{l.society_id ? ` · ${names[l.society_id] || ''}` : ''}</div>{l.summary}</li>)}</ul>
        ) : <Empty>Nothing yet.</Empty>}
      </section>
    </>
  );
}
