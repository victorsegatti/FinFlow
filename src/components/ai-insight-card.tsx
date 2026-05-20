'use client';
import { useEffect, useState } from 'react';

const CACHE_KEY = 'finflow:ai-insight';
type Cached = { date: string; insight: string };

function today(): string {
  return new Date().toISOString().slice(0, 10); // yyyy-mm-dd
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (parsed.date !== today()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(insight: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), insight })); } catch {}
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export function AIInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  async function load(force = false) {
    setLoading(true);
    setErr(null);
    if (!force) {
      const cached = readCache();
      if (cached) {
        setInsight(cached.insight);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }
    try {
      const r = await fetch('/api/ai/summary', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'erro');
      setInsight(j.insight);
      setFromCache(false);
      writeCache(j.insight);
    } catch (e: any) {
      setErr(e?.message || 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (err) return null;

  return (
    <div className="ff-enter mt-4 rounded-md p-3.5 flex items-start gap-3 border"
         style={{ background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft)' }}>
      <div className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0"
           style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
        <i className="ti ti-sparkles text-base" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--c-brand)' }}>
            Insight do dia
          </div>
          {!loading && insight && (
            <button onClick={() => { clearCache(); load(true); }}
                    aria-label="Atualizar insight"
                    className="press w-6 h-6 rounded-full grid place-items-center border-none cursor-pointer"
                    style={{ background: 'transparent', color: 'var(--c-brand)' }}>
              <i className="ti ti-refresh text-xs" />
            </button>
          )}
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
