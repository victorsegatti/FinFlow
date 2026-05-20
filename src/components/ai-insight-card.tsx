'use client';
import { useEffect, useState } from 'react';

export function AIInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/ai/summary', { cache: 'no-store' });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) setErr(j.error || 'erro');
        else setInsight(j.insight);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'erro');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (err) return null;

  return (
    <div className="ff-enter mt-4 rounded-md p-3.5 flex items-start gap-3 border"
         style={{ background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft)' }}>
      <div className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0"
           style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
        <i className="ti ti-sparkles text-base" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--c-brand)' }}>
          Insight do mês
        </div>
        {loading ? (
          <div className="text-sm text-muted">Analisando seus dados…</div>
        ) : (
          <div className="text-sm text-ink leading-snug">{insight}</div>
        )}
      </div>
    </div>
  );
}
