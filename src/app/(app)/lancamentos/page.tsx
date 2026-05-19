'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TxRow, DateGroup } from '@/components/tx-row';
import { MetricCard } from '@/components/metric-card';
import { Transaction, Category } from '@/types/database';
import { cn, fmtBRL } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LancamentosPage() {
  const supabase = createClient();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(*)').order('date', { ascending: false }).limit(100),
        supabase.from('categories').select('*'),
      ]);
      setTxs((t || []) as Transaction[]);
      setCats((c || []) as Category[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = txs.filter((t) => {
    const okCat = filterCat === 'todos' || t.category_id === filterCat;
    const okQ = !q || t.description.toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  });

  const total = filtered.reduce(
    (s, t) => s + (t.type === 'receita' ? Number(t.amount) : -Number(t.amount)),
    0
  );

  // Group by date
  const groups: { date: string; label: string; items: Transaction[] }[] = [];
  for (const tx of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) {
      last.items.push(tx);
    } else {
      groups.push({
        date: tx.date,
        label: format(new Date(tx.date + 'T00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }),
        items: [tx],
      });
    }
  }

  return (
    <>
      <div className="ff-enter mb-5">
        <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          Lançamentos
        </h1>
        <p className="text-xs text-muted mt-0.5">Histórico completo</p>
      </div>

      <div className="relative mb-3">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Buscar lançamento..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-10 pl-10 pr-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
        {[{ id: 'todos', name: 'Todos' }, ...cats].map((c) => {
          const active = filterCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={cn(
                'press shrink-0 px-3 py-1.5 rounded-pill border text-[11px] font-medium transition-colors',
                active ? 'bg-ink text-bg border-ink' : 'border-border text-muted bg-card'
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label="Mostrando" value={filtered.length} icon="ti-list" format="integer" />
        <MetricCard label="Saldo do filtro" value={total} tone={total >= 0 ? 'success' : 'danger'} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">Nenhum lançamento encontrado</div>
      ) : (
        groups.map((g) => {
          const groupTotal = g.items.reduce(
            (s, t) => s + (t.type === 'receita' ? Number(t.amount) : -Number(t.amount)),
            0
          );
          return (
            <DateGroup key={g.date} date={g.label} total={groupTotal}>
              {g.items.map((t, i) => <TxRow key={t.id} tx={t} index={i} />)}
            </DateGroup>
          );
        })
      )}

      <Link
        href="/lancamentos/novo"
        className="press mt-6 flex items-center justify-center gap-1.5 w-full py-3.5 rounded-pill text-sm font-semibold"
        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}
      >
        <i className="ti ti-plus" /> Novo lançamento
      </Link>
    </>
  );
}
