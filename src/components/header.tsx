'use client';
import { fmtMonth } from '@/lib/format';
import { useState } from 'react';

export function Header({ userName }: { userName: string }) {
  const [month] = useState(new Date());
  return (
    <header className="md:hidden px-5 py-4 flex justify-between items-center border-b border-border bg-bg-elev">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl grid place-items-center bg-brand text-brand-fg">
          <i className="ti ti-wallet text-base" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>FinFlow</div>
          <div className="text-[11px] text-muted">Olá, {userName}</div>
        </div>
      </div>
      <button className="press flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-pill text-xs text-muted">
        <i className="ti ti-calendar" />
        <span className="capitalize">{fmtMonth(month)}</span>
        <i className="ti ti-chevron-down" />
      </button>
    </header>
  );
}
