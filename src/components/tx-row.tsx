import { Transaction } from '@/types/database';
import { fmtBRL, fmtDate } from '@/lib/format';

export function TxRow({ tx, index = 0 }: { tx: Transaction; index?: number }) {
  const cat = tx.category;
  const tone = cat?.color || '#6B7280';
  const isIncome = tx.type === 'receita';

  return (
    <div className="ff-row bg-card border border-border rounded-md flex items-center gap-3 p-3.5 cursor-pointer"
         style={{ animationDelay: `${index * 30}ms` }}>
      <div className="w-[38px] h-[38px] rounded-xl grid place-items-center shrink-0"
           style={{ background: tone + '1A', color: tone }}>
        <i className={`ti ${cat?.icon || 'ti-tag'} text-lg`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
          {tx.description}
          {tx.is_recurring && <i className="ti ti-rotate-clockwise-2 text-[11px] text-muted shrink-0" />}
        </div>
        <div className="text-xs text-muted mt-0.5">
          {cat?.name || 'Sem categoria'} · {fmtDate(tx.date)}
        </div>
      </div>
      <div className="num text-[15px] font-semibold whitespace-nowrap"
           style={{ color: isIncome ? 'var(--c-success)' : 'var(--c-ink)', letterSpacing: '-0.02em' }}>
        {isIncome ? '+' : '−'}{fmtBRL(tx.amount)}
      </div>
    </div>
  );
}

export function DateGroup({ date, total, children }: { date: string; total: number; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between px-1 pb-2 text-xs text-muted font-medium">
        <span className="uppercase tracking-wider">{date}</span>
        <span className="num">{total >= 0 ? '+' : '−'}{fmtBRL(Math.abs(total))}</span>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}
