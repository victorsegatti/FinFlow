'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fmtBRL } from '@/lib/format';

type Suggestion = { category: string; suggested_amount: number; reasoning: string };

export function SuggestBudgets() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setOpen(true);
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/ai/budgets', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'erro');
      setSuggestions(j.suggestions || []);
      setSummary(j.summary || '');
      setSelected(new Set(j.suggestions?.map((_: any, i: number) => i) || []));
    } catch (e: any) {
      setErr(e?.message || 'erro');
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cats } = await supabase.from('categories').select('id, name');
      const catMap = new Map((cats || []).map((c: any) => [c.name.toLowerCase(), c.id]));

      const toInsert = Array.from(selected).map((i) => {
        const s = suggestions[i];
        return {
          user_id: user.id,
          name: `Orçamento ${s.category}`,
          target_amount: s.suggested_amount,
          type: 'budget',
          period: 'monthly',
          category_id: catMap.get(s.category.toLowerCase()) || null,
        };
      });

      if (toInsert.length > 0) {
        await supabase.from('goals').insert(toInsert);
      }
      setOpen(false);
      setSuggestions([]);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={load} className="press w-full mb-3 flex items-center justify-center gap-1.5 py-3 rounded-md text-sm font-medium border"
              style={{ background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft)', color: 'var(--c-brand)' }}>
        <i className="ti ti-sparkles" /> Sugerir orçamentos com IA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="ff-backdrop absolute inset-0 cursor-pointer"
               onClick={() => !saving && setOpen(false)}
               style={{ background: 'rgba(10,15,12,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="ff-sheet relative bg-bg-elev rounded-t-[28px] p-4 pb-8 max-h-[88vh] overflow-y-auto"
               style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }}>
            <div className="flex justify-center pb-3">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <i className="ti ti-sparkles" style={{ color: 'var(--c-brand)' }} /> Sugestões da IA
              </h2>
              <button onClick={() => !saving && setOpen(false)}
                      className="press w-8 h-8 rounded-full grid place-items-center bg-border-2 text-ink-2 border-none cursor-pointer">
                <i className="ti ti-x text-sm" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted text-sm">Analisando seus dados…</div>
            ) : err ? (
              <div className="text-center py-12 text-danger text-sm">{err}</div>
            ) : (
              <>
                {summary && (
                  <p className="text-xs text-muted mb-4 leading-relaxed">{summary}</p>
                )}
                <div className="flex flex-col gap-2 mb-4">
                  {suggestions.map((s, i) => {
                    const active = selected.has(i);
                    return (
                      <button key={i}
                              onClick={() => {
                                const next = new Set(selected);
                                if (active) next.delete(i); else next.add(i);
                                setSelected(next);
                              }}
                              className="press text-left bg-card border rounded-md p-3.5 flex items-start gap-3 cursor-pointer"
                              style={{ borderColor: active ? 'var(--c-brand)' : 'var(--c-border)' }}>
                        <div className="w-5 h-5 rounded grid place-items-center shrink-0 mt-0.5"
                             style={{ background: active ? 'var(--c-brand)' : 'transparent', border: active ? 'none' : '1.5px solid var(--c-border)' }}>
                          {active && <i className="ti ti-check text-xs" style={{ color: 'var(--c-brand-fg)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-ink">{s.category}</span>
                            <span className="num text-sm font-semibold text-ink">{fmtBRL(s.suggested_amount)}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-1 leading-snug">{s.reasoning}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={apply} disabled={selected.size === 0 || saving}
                        className="press w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 border-none cursor-pointer"
                        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
                  <i className="ti ti-check" /> {saving ? 'Salvando…' : `Criar ${selected.size} orçamento${selected.size === 1 ? '' : 's'}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
