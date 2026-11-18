'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { db, friendly, must } from '@/lib/supabase';
import { timeLabel, waLink } from '@/lib/format';
import { Empty, useRun, useToast } from '@/components/ui';

const STATUS: Record<string, string> = { new: 'New', contacted: 'Contacted', onboarded: 'Onboarded', not_interested: 'Not interested' };

export default function Leads() {
  const toast = useToast();
  const { run } = useRun();
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(async () => { try { setRows(must(await db().from('leads').select('*').order('created_at', { ascending: false })) as any[]); } catch (e) { toast(friendly(e), true); setRows([]); } }, [toast]);
  useEffect(() => { load(); }, [load]);
  const setStatus = (id: string, status: string) => run(async () => { must(await db().from('leads').update({ status }).eq('id', id)); await load(); });
  const setNote = (id: string, note: string) => run(async () => { must(await db().from('leads').update({ note: note || null }).eq('id', id)); toast('Note saved'); });
  return (
    <>
      <div className="page-head"><div><h1>Registrations</h1><p className="muted">Societies that registered interest on the Tierbridge home page.</p></div></div>
      <section className="panel">
        {rows === null ? <p className="muted">Loading…</p> : rows.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Society</th><th>Contact</th><th>Registered</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.society_name}</b><div className="small muted">{r.city} · {r.flats} flats</div></td>
                <td className="small">{r.name}{r.role ? `, ${r.role}` : ''}<div><a href={`tel:${r.mobile}`}>{r.mobile}</a> · <a target="_blank" rel="noopener" href={waLink(r.mobile, `Hi ${r.name}, thanks for registering ${r.society_name} on Tierbridge.`)}>WhatsApp</a></div>{r.email && <div className="muted">{r.email}</div>}</td>
                <td className="small">{timeLabel(r.created_at)}</td>
                <td><select aria-label="Status" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} style={{ minHeight: 36, padding: '4px 8px' }}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  {r.status !== 'onboarded' && <div><Link className="small" href="/admin/new">Set up society</Link></div>}</td>
                <td><input aria-label="Note" type="text" defaultValue={r.note || ''} onBlur={(e) => { if ((e.target.value || null) !== r.note) setNote(r.id, e.target.value); }} style={{ minHeight: 36 }} /></td>
              </tr>))}</tbody>
          </table></div>
        ) : <Empty>No registrations yet.</Empty>}
      </section>
    </>
  );
}
