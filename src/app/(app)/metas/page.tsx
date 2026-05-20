import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Goal, Transaction } from '@/types/database';
import { fmtBRL, cn } from '@/lib/format';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { SuggestBudgets } from '@/components/suggest-budgets';

export const dynamic = 'force-dynamic';

export default async function MetasPage() {
  const supabase = createClient();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [{ data: goalsRaw }, { data: txs }] = await Promise.all([
    supabase.from('goals').select('*, category:categories(*)'),
    supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('type', 'despesa')
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ]);

  const goals = (goalsRaw || []) as Goal[];
  const transactions = (txs || []) as Pick<Transaction, 'category_id' | 'amount' | 'type'>[];

  const spentByCat: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.category_id) spentByCat[t.category_id] = (spentByCat[t.category_id] || 0) + Number(t.amount);
  });

  const budgets = goals.filter((g) => g.type === 'budget');
  const savings = goals.filter((g) => g.type === 'savings');

  return (
    <>
      <div className="ff-enter mb-5">
        <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          Metas
        </h1>
        <p className="text-xs text-muted mt-0.5">Orçamentos e poupança</p>
      </div>

      <SuggestBudgets />

      <div className="text-[11px] text-muted font-medium uppercase tracking-wider mb-2 px-0.5">Orçamentos do mês</div>
      {budgets.length === 0 ? (
        <EmptyState text="Você ainda não definiu orçamentos por categoria." />
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {budgets.map((g) => {
            const spent = g.category_id ? spentByCat[g.category_id] || 0 : 0;
            const pct = Math.min(100, Math.round((spent / Number(g.target_amount)) * 100));
            return (
              <Link key={g.id} href={`/metas/${g.id}`} className="no-underline" style={{ color: 'inherit' }}>
                <GoalBar
                  name={g.name}
                  icon={g.category?.icon || 'ti-target'}
                  color={g.category?.color || 'var(--c-brand)'}
                  spent={spent}
                  target={Number(g.target_amount)}
                  pct={pct}
                  over={spent > Number(g.target_amount)}
                />
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-[11px] text-muted font-medium uppercase tracking-wider mb-2 px-0.5">Metas de poupança</div>
      {savings.length === 0 ? (
        <EmptyState text="Nenhuma meta de poupança criada." />
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {savings.map((g) => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
            return (
              <Link key={g.id} href={`/metas/${g.id}`} className="no-underline" style={{ color: 'inherit' }}>
                <GoalBar
                  name={g.name}
                  icon={g.category?.icon || 'ti-pig-money'}
                  color={g.category?.color || 'var(--c-brand)'}
                  spent={Number(g.current_amount)}
                  target={Number(g.target_amount)}
                  pct={pct}
                  over={false}
                  savings
                />
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/metas/nova"
        className="press mt-2 w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5"
        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}
      >
        <i className="ti ti-plus" /> Nova meta
      </Link>
    </>
  );
}

function GoalBar({
  name, icon, color, spent, target, pct, over, savings = false,
}: {
  name: string; icon: string; color: string; spent: number; target: number; pct: number; over: boolean; savings?: boolean;
}) {
  return (
    <div className="ff-row bg-card border border-border rounded-md p-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] grid place-items-center shrink-0"
               style={{ background: color + '1A', color }}>
            <i className={`ti ${icon} text-sm`} />
          </div>
          <span className="text-sm font-medium text-ink">{name}</span>
        </div>
        <div className="text-xs text-muted num" style={{ letterSpacing: '-0.01em' }}>
          {fmtBRL(spent)} / {fmtBRL(target)}
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="ff-fill h-full rounded-full"
          style={{ width: `${pct}%`, background: over ? 'var(--c-danger)' : color }}
        />
      </div>
      <div className="flex justify-between text-[11px] mt-1.5">
        <span className="text-muted">{pct}% {savings ? 'da meta' : 'usado'}</span>
        <span className={over ? 'text-danger font-medium' : 'text-muted'}>
          {over ? `Estourou em ${fmtBRL(spent - target)}` : `Resta ${fmtBRL(target - spent)}`}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-muted text-xs bg-card border border-border rounded-md mb-6">
      {text}
    </div>
  );
}
