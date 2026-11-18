'use client';
import Link from 'next/link';
import { useSociety } from '@/lib/society';
import { monthLabel } from '@/lib/format';

const WORD: Record<string, string> = { verified: 'Paid ✓', marked: 'Awaiting check', rejected: 'Not received', unpaid: 'Not paid' };

export function Building({ month }: { month: string }) {
  const s = useSociety();
  const blocks = s.blocks.length ? s.blocks : [{ id: null, name: '' }];
  return (
    <div>
      <div className="blocks" role="img" aria-label={`Payment status of every flat for ${monthLabel(month, true)}`}>
        {blocks.map((b) => {
          const units = s.units.filter((u) => !b.id || u.block_id === b.id);
          const floors = Array.from(new Set(units.map((u) => u.floor))).sort((a, c) => c - a);
          const per = Math.max(1, ...floors.map((f) => units.filter((u) => u.floor === f).length));
          return (
            <div key={b.id || 'all'} className="facade" style={{ ['--per' as any]: Math.min(per, 6) }}>
              {blocks.length > 1 && <div className="bname">{b.name}</div>}
              {floors.map((f) => (
                <div key={f} className="floor">
                  <div className="floor-no" aria-hidden="true">{f === 0 ? 'G' : `F${f}`}</div>
                  {units.filter((u) => u.floor === f).map((u) => {
                    const st = s.statusOf(u.id, month);
                    return (
                      <Link key={u.id} href={`/${s.society.slug}/payments`} className={`win ${st} ${u.id === s.me?.unit_id ? 'mine' : ''}`} title={`Flat ${u.number}: ${WORD[st]}`}>
                        <span className="flat">{u.number}</span><span className="st">{WORD[st]}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--win-lit)' }} />Paid and verified</span>
        <span><i style={{ background: 'var(--win-wait)', border: '2px dashed var(--win-wait-edge)' }} />Marked paid, awaiting check</span>
        <span><i style={{ background: 'var(--win-dark)' }} />Not paid</span>
      </div>
    </div>
  );
}
