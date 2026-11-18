'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { db, friendly, must } from '@/lib/supabase';
import { slugify } from '@/lib/format';
import { Empty, Modal, useRun, useToast } from '@/components/ui';
import { BLANK_LAYOUT, clone, duplicates, flatCount, Layout, LayoutEditor } from '@/components/LayoutEditor';

type Tpl = { id: string; name: string; description: string; layout: Layout; sort: number; visible: boolean };

export default function Templates() {
  const toast = useToast();
  const { busy, run } = useRun();
  const [rows, setRows] = useState<Tpl[] | null>(null);
  const [edit, setEdit] = useState<{ isNew: boolean; t: Tpl } | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => { try { setRows(must(await db().from('templates').select('*').order('sort').order('name')) as Tpl[]); } catch (e) { toast(friendly(e), true); setRows([]); } }, [toast]);
  useEffect(() => { load(); }, [load]);

  const toggle = (t: Tpl) => run(async () => { must(await db().from('templates').update({ visible: !t.visible }).eq('id', t.id)); toast(t.visible ? `${t.name} is hidden from sign-up` : `${t.name} is shown at sign-up`); await load(); });
  const remove = (t: Tpl) => run(async () => {
    if (!window.confirm(`Delete the template “${t.name}”? Societies already created from it keep their layout.`)) return;
    const { error } = await db().from('templates').delete().eq('id', t.id);
    if (error) { toast(/foreign key/i.test(error.message) ? 'Societies were created from this template, so it can’t be deleted. Hide it instead.' : friendly(error), true); return; }
    toast('Template deleted'); await load();
  });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!edit) return; const t = edit.t;
    setErr('');
    if (!t.name.trim()) { setErr('Give the template a name.'); return; }
    if (!flatCount(t.layout)) { setErr('The layout has no flats.'); return; }
    if (duplicates(t.layout).length) { setErr('Some flat numbers repeat. Give blocks different prefixes.'); return; }
    await run(async () => {
      const row = { name: t.name.trim(), description: t.description.trim() || `${flatCount(t.layout)} flats`, layout: t.layout, sort: Number(t.sort) || 100, visible: t.visible };
      if (edit.isNew) must(await db().from('templates').insert({ id: slugify(t.name) || `template-${Date.now()}`, ...row }));
      else must(await db().from('templates').update(row).eq('id', t.id));
      setEdit(null); toast('Template saved'); await load();
    });
  }
  const set = (patch: Partial<Tpl>) => edit && setEdit({ ...edit, t: { ...edit.t, ...patch } });

  return (
    <>
      <div className="page-head">
        <div><h1>Building templates</h1><p className="muted">The layouts societies choose from when they sign up for their free month, and that you use when setting one up. Hidden templates are only offered here in the console.</p></div>
        <button className="btn primary" onClick={() => { setErr(''); setEdit({ isNew: true, t: { id: '', name: '', description: '', layout: clone(BLANK_LAYOUT), sort: 100, visible: true } }); }}>New template</button>
      </div>
      <section className="panel">
        {rows === null ? <p className="muted">Loading…</p> : rows.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Template</th><th className="right">Flats</th><th>Order</th><th>At sign-up</th><th></th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}>
                <td><b>{t.name}</b><div className="small muted">{t.description}</div></td>
                <td className="right num">{flatCount(t.layout)}</td>
                <td className="num">{t.sort}</td>
                <td>{t.visible ? <span className="badge good">Shown</span> : <span className="badge quiet">Hidden</span>}</td>
                <td><div className="btn-row">
                  <button className="btn small" onClick={() => { setErr(''); setEdit({ isNew: false, t: { ...t, layout: clone(t.layout) } }); }}>Edit</button>
                  <button className="btn small" disabled={busy} onClick={() => toggle(t)}>{t.visible ? 'Hide' : 'Show'}</button>
                  <button className="btn danger small" disabled={busy} onClick={() => remove(t)}>Delete</button>
                </div></td>
              </tr>))}</tbody>
          </table></div>
        ) : <Empty>No templates yet.</Empty>}
      </section>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'New template' : `Edit ${edit?.t.name}`}>
        {edit && (
          <form onSubmit={save} noValidate className="stack">
            <div className="form-grid two">
              <label className="field"><span>Name</span><input type="text" value={edit.t.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="field"><span>Order in the list</span><input type="number" value={edit.t.sort} onChange={(e) => set({ sort: Number(e.target.value) })} /></label>
              <label className="field full"><span>Short description</span><input type="text" value={edit.t.description} placeholder="e.g. Stilt parking + 5 floors, 4 flats per floor" onChange={(e) => set({ description: e.target.value })} /></label>
              <label className="check full"><input type="checkbox" checked={edit.t.visible} onChange={(e) => set({ visible: e.target.checked })} /> Show this template when societies sign up</label>
            </div>
            <LayoutEditor layout={edit.t.layout} onChange={(l) => set({ layout: l })} />
            <p role="alert" className="err">{err}</p>
            <div className="btn-row"><button className="btn primary" type="submit" disabled={busy}>Save template</button><button className="btn" type="button" onClick={() => setEdit(null)}>Cancel</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
