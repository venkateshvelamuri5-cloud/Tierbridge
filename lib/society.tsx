'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { db, must } from './supabase';
import { addMonths, monthOf, monthsBetween, thisMonth } from './format';
import { BUCKET } from './config';

export type Society = {
  id: string; slug: string; name: string; city: string; upi_id: string | null; payee_name: string | null; qr_path: string | null;
  opening_balance: number; start_month: string; due_day: number; phone_visibility: 'all' | 'admins';
  status: 'trial' | 'active' | 'read_only' | 'cancelled'; trial_ends_on: string; paid_until: string | null;
};
export type Unit = { id: string; number: string; floor: number; block_id: string; plan_id: string | null; has_tenant: boolean };
export type Member = { user_id: string; society_id: string; unit_id: string; role: 'owner' | 'tenant'; login_id: string; is_admin: boolean; full_name: string | null; phone: string | null; must_change_password: boolean; active: boolean };
export type Resident = { user_id: string; unit_id: string; unit_number: string; role: string; login_id: string; is_admin: boolean; full_name: string | null; phone: string | null; active: boolean; signed_in: boolean };

type Data = {
  society: Society; me: Member | null; isPlatform: boolean; units: Unit[]; blocks: any[]; plans: any[]; rates: any[];
  payments: any[]; expenses: any[]; residents: Resident[]; names: Record<string, string>;
};

type Ctx = Data & {
  refresh: () => Promise<void>;
  month: string; setMonth: (m: string) => void;
  isAdmin: boolean; writable: boolean;
  unitById: (id: string) => Unit | undefined;
  rateFor: (unitId: string, m: string) => number | null;
  payFor: (unitId: string, m: string) => any;
  statusOf: (unitId: string, m: string) => string;
  collectedIn: (m: string) => any[];
  expensesIn: (m: string, status?: string) => any[];
  balanceThrough: (m: string) => number;
  expectedIn: (m: string) => number;
  trackedMonths: () => string[];
  who: (id?: string | null) => string;
  fileUrl: (path: string) => Promise<string>;
  upload: (file: File | undefined | null, folder: string) => Promise<string | null>;
};

const SocietyCtx = createContext<Ctx | null>(null);
export const useSociety = () => { const c = useContext(SocietyCtx); if (!c) throw new Error('No society'); return c; };

export const counts = (p: any) => !!p && (p.status === 'marked' || p.status === 'verified');
export const sum = (arr: any[], k = 'amount') => arr.reduce((a, x) => a + Number(x[k] || 0), 0);

export async function loadSociety(slug: string, userId: string): Promise<Data> {
  const c = db();
  const soc = must(await c.from('societies').select('*').eq('slug', slug).maybeSingle()) as Society | null;
  if (!soc) throw new Error('not-member');
  const sid = soc.id;
  const [me, plat, units, blocks, plans, rates, payments, expenses, residents, names] = await Promise.all([
    c.from('members').select('*').eq('user_id', userId).eq('society_id', sid).maybeSingle().then(must),
    c.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle().then(must),
    c.from('units').select('*').eq('society_id', sid).order('floor').order('number').then(must),
    c.from('blocks').select('*').eq('society_id', sid).order('sort').then(must),
    c.from('unit_plans').select('*').eq('society_id', sid).order('name').then(must),
    c.from('rates').select('*').eq('society_id', sid).order('effective_from').then(must),
    c.from('payments').select('*').eq('society_id', sid).then(must),
    c.from('expenses').select('*').eq('society_id', sid).order('spent_on', { ascending: false }).then(must),
    c.rpc('directory', { p_society: sid }).then(must),
    c.rpc('names', { p_society: sid }).then(must),
  ]);
  const nameMap: Record<string, string> = {};
  (names as any[]).forEach((n) => { nameMap[n.user_id] = n.label; });
  return { society: soc, me: me as Member | null, isPlatform: !!plat, units: units as Unit[], blocks: blocks as any[], plans: plans as any[], rates: rates as any[], payments: payments as any[], expenses: expenses as any[], residents: residents as Resident[], names: nameMap };
}

export function SocietyProvider({ initial, userId, children }: { initial: Data; userId: string; children: ReactNode }) {
  const [data, setData] = useState<Data>(initial);
  const [month, setMonth] = useState(thisMonth());
  const refresh = useCallback(async () => { setData(await loadSociety(initial.society.slug, userId)); }, [initial.society.slug, userId]);
  useEffect(() => { setData(initial); }, [initial]);

  const value = useMemo<Ctx>(() => {
    const { society, units, rates, payments, expenses, me, isPlatform, names } = data;
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const unitById = (id: string) => unitMap.get(id);
    const rateFor = (unitId: string, m: string) => {
      const u = unitMap.get(unitId);
      const pick = (planOnly: boolean) => rates.filter((r) => r.effective_from <= m && (planOnly ? r.plan_id && r.plan_id === u?.plan_id : !r.plan_id))
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
      const r = pick(true) || pick(false);
      return r ? Number(r.amount) : null;
    };
    const payFor = (unitId: string, m: string) => payments.find((p) => p.unit_id === unitId && p.month === m);
    const statusOf = (unitId: string, m: string) => { const p = payFor(unitId, m); return p ? p.status : 'unpaid'; };
    const collectedIn = (m: string) => payments.filter((p) => p.month === m && counts(p));
    const expensesIn = (m: string, status = 'approved') => expenses.filter((e) => monthOf(e.spent_on) === m && e.status === status);
    const balanceThrough = (m: string) => Number(society.opening_balance || 0)
      + sum(payments.filter((p) => counts(p) && p.month <= m))
      - sum(expenses.filter((e) => e.status === 'approved' && monthOf(e.spent_on) <= m));
    const expectedIn = (m: string) => units.reduce((a, u) => a + (rateFor(u.id, m) || 0), 0);
    const trackedMonths = () => monthsBetween(society.start_month, thisMonth());
    const today = new Date().toISOString().slice(0, 10);
    const writable = society.status === 'active' ? (society.paid_until || today) >= today
      : society.status === 'trial' ? society.trial_ends_on >= today : false;
    const who = (id?: string | null) => (id && names[id]) || '—';
    const fileUrl = async (path: string) => {
      const { data: d, error } = await db().storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error) throw error; return d.signedUrl;
    };
    const upload = async (file: File | undefined | null, folder: string) => {
      if (!file) return null;
      let blob: Blob = file; let ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      if (/^image\/(jpeg|png|webp)$/.test(file.type) && file.size > 600 * 1024) {
        try { blob = await shrinkImage(file); ext = 'jpg'; } catch { blob = file; }
      }
      if (blob.size > 8 * 1024 * 1024) throw new Error('That file is larger than 8 MB. Take a smaller photo and try again.');
      const path = `${society.id}/${folder}/${thisMonth().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db().storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type, upsert: false });
      if (error) throw error;
      return path;
    };
    return {
      ...data, refresh, month, setMonth,
      isAdmin: isPlatform || !!me?.is_admin, writable,
      unitById, rateFor, payFor, statusOf, collectedIn, expensesIn, balanceThrough, expectedIn, trackedMonths, who, fileUrl, upload,
    };
  }, [data, month, refresh]);

  return <SocietyCtx.Provider value={value}>{children}</SocietyCtx.Provider>;
}

function shrinkImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('shrink failed'))), 'image/jpeg', 0.82);
    };
    img.onerror = reject; img.src = url;
  });
}

export { addMonths };
