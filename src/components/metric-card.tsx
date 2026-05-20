'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmtBRL } from '@/lib/format';

export function MetricCard({ label, value, icon, tone = 'success', deltaPct, format = 'currency' }: {
  label: string; value: number; icon?: string;
  tone?: 'success' | 'danger';
  deltaPct?: number;
  format?: 'currency' | 'integer';
}) {
  const display = format === 'integer' ? String(value) : fmtBRL(value);
  const isPos = (deltaPct ?? 0) >= 0;
  const good = tone === 'success' ? isPos : !isPos;

  return (
    <div className="press bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted font-medium uppercase tracking-wider">{label}</span>
        {icon && (
          <div className={`w-[26px] h-[26px] rounded-[8px] grid place-items-center
            ${tone === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
            <i className={`ti ${icon} text-sm`} />
          </div>
        )}
      </div>
      <div className="num text-[22px] font-semibold text-ink"
           style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
        {display}
      </div>
      {deltaPct !== undefined && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`flex items-center gap-0.5 font-semibold ${good ? 'text-success' : 'text-danger'}`}>
            <i className={`ti ${isPos ? 'ti-arrow-up-right' : 'ti-arrow-down-right'} text-[13px]`} />
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
          <span className="text-muted">vs. mês anterior</span>
        </div>
      )}
    </div>
  );
}

export function BigBalanceCard({ value, weekly, onAction, deltaPct }: {
  value: number; weekly?: number[]; onAction?: () => void; deltaPct?: number;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('finflow:balance-hidden') : null;
    if (stored === '1') setHidden(true);
  }, []);
  const toggle = () => {
    setHidden((h) => {
      const next = !h;
      try { window.localStorage.setItem('finflow:balance-hidden', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const data = weekly ?? [0, 0, 0, 0, 0, 0, value];
  const w = 240, h = 56, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    pad + (1 - (v - min) / range) * (h - pad * 2),
  ]);
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const area = path + ` L240 56 L0 56 Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="rounded-xl p-5 relative overflow-hidden shadow-2"
         style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 240px 120px at 20% 0%, rgba(255,255,255,0.08), transparent 60%)' }} />

      <div className="relative flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest opacity-70 font-medium">Saldo do mês</span>
        <button onClick={toggle} className="press w-8 h-8 rounded-full grid place-items-center border-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'inherit' }}
                aria-label={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}>
          <i className={`ti ${hidden ? 'ti-eye-off' : 'ti-eye'} text-sm`} />
        </button>
      </div>

      <div className="relative num text-[44px] font-semibold leading-none"
           style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
        {hidden ? 'R$ ••••••' : fmtBRL(value)}
      </div>

      {deltaPct !== undefined && (
        <div className="relative mt-1.5 flex items-center gap-2 text-[13px]" style={{ opacity: 0.85 }}>
          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.10)' }}>
            <i className={`ti ${deltaPct >= 0 ? 'ti-trending-up' : 'ti-trending-down'} text-sm`} />
            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
          </span>
          <span style={{ opacity: 0.75 }}>vs. semana anterior</span>
        </div>
      )}

      <div className="relative mt-3.5 mb-2">
        <svg width="100%" height="56" viewBox="0 0 240 56" preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id="ff-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-on-brand)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--c-on-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ff-spark)" />
          <path d={path} fill="none" stroke="var(--c-on-brand)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--c-on-brand)" />
        </svg>
        <div className="flex justify-between text-[10px] opacity-60 font-medium mt-0.5">
          {['S','T','Q','Q','S','S','D'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>

      <div className="relative flex gap-2 mt-2">
        {onAction ? (
          <button onClick={onAction} className="press flex-1 h-11 rounded-pill border-none cursor-pointer
                   flex items-center justify-center gap-1.5 font-semibold text-sm"
                  style={{ background: 'var(--c-on-brand)', color: 'var(--c-brand)', fontFamily: 'inherit' }}>
            <i className="ti ti-plus text-base" /> Novo lançamento
          </button>
        ) : (
          <Link href="/lancamentos/novo" className="press flex-1 h-11 rounded-pill
                   flex items-center justify-center gap-1.5 font-semibold text-sm"
                style={{ background: 'var(--c-on-brand)', color: 'var(--c-brand)', fontFamily: 'inherit' }}>
            <i className="ti ti-plus text-base" /> Novo lançamento
          </Link>
        )}
      </div>
    </div>
  );
}
