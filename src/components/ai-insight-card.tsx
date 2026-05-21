'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Cached = { date: string; insight: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function keyFor(userId: string) {
  return `finflow:ai-insight:${userId}`;
}

function readCache(userId: string): Cached | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (parsed.date !== today()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, insight: string) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify({ date: today(), insight })); } catch {}
}

function clearCache(userId: string) {
  try { localStorage.removeItem(keyFor(userId)); } catch {}
}

export function AIInsightCard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(uid: string, force = false) {
    setLoading(true);
    setErr(null);
    if (!force) {
      const cached = readCache(uid);
      if (cached) {
        setInsight(cached.insight);
        setLoading(false);
        return;
      }
    }
    try {
      const r = await fetch('/api/ai/summary', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'erro');
      setInsight(j.insight);
      writeCache(uid, j.insight);
    } catch (e: any) {
      setErr(e?.message || 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      load(user.id);
    })();
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
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--c-brand)' }}>
            Insight do dia
          </div>
          {!loading && insight && userId && (
            <button onClick={() => { clearCache(userId); load(userId, true); }}
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
