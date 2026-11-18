'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { friendly } from '@/lib/supabase';
import { addMonths, monthLabel, monthsBetween, thisMonth } from '@/lib/format';

/* ---------- toast ---------- */
type ToastFn = (msg: string, isError?: boolean) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; err: boolean } | null>(null);
  const timer = useRef<any>(null);
  const show = useCallback<ToastFn>((msg, err = false) => {
    setT({ msg, err }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), err ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className={`toast ${t ? 'show' : ''} ${t?.err ? 'error' : ''}`}>{t?.msg}</div>
    </ToastCtx.Provider>
  );
}

/* Runs an async action, disables the button while it runs, shows errors. */
export function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); } catch (e) { console.error(e); toast(friendly(e), true); } finally { setBusy(false); }
  }, [toast]);
  return { busy, run };
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal(); if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="modal-title">
      {open && <div className="modal-body"><h2 id="modal-title">{title}</h2>{children}</div>}
    </dialog>
  );
}

/* ---------- badges ---------- */
const BADGE: Record<string, string> = {
  verified: '✓ Verified', marked: '◷ Awaiting check', rejected: '✕ Not received', unpaid: '○ Not paid',
  approved: '✓ Approved', pending: '◷ Waiting for approval',
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed',
  trial: 'Trial', active: 'Paid', read_only: 'Read-only', cancelled: 'Cancelled',
};
const TONE: Record<string, string> = {
  verified: 'good', approved: 'good', resolved: 'good', closed: 'quiet', active: 'good',
  marked: 'warn', pending: 'warn', in_progress: 'warn', trial: 'info', open: 'info',
  rejected: 'bad', read_only: 'bad', cancelled: 'quiet', unpaid: 'quiet',
};
export const Badge = ({ status, children }: { status: string; children?: ReactNode }) =>
  <span className={`badge ${TONE[status] || 'quiet'}`}>{children ?? BADGE[status] ?? status}</span>;

/* ---------- month picker ---------- */
export function MonthPicker({ value, onChange, from, label = 'Month' }: { value: string; onChange: (m: string) => void; from: string; label?: string }) {
  const start = from < addMonths(thisMonth(), -36) ? addMonths(thisMonth(), -36) : from;
  const list = monthsBetween(start, addMonths(thisMonth(), 1)).reverse();
  if (!list.includes(value)) list.unshift(value);
  return (
    <label className="field" style={{ minWidth: 190 }}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
      </select>
    </label>
  );
}

/* ---------- file link ---------- */
export function FileLink({ path, label, getUrl }: { path?: string | null; label: string; getUrl: (p: string) => Promise<string> }) {
  const toast = useToast();
  if (!path) return null;
  return (
    <button type="button" className="btn link small" onClick={async () => {
      const w = window.open('', '_blank');
      try { const u = await getUrl(path); if (w) w.location.href = u; else window.location.href = u; }
      catch (e) { if (w) w.close(); toast(friendly(e), true); }
    }}>{label}</button>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;
