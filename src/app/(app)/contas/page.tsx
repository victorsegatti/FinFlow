'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bill } from '@/types/database';
import { fmtBRL, fmtDate, cn } from '@/lib/format';
import { MetricCard } from '@/components/metric-card';
import { ConfirmDialog } from '@/components/confirm-dialog';

export default function ContasPage() {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [tab, setTab] = useState<'pagar' | 'receber'>('pagar');
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState<Bill | null>(null);
  const [undoing, setUndoing] = useState(false);

  async function load() {
    const { data } = await supabase.from('bills').select('*').order('due_date');
    setBills((data || []) as Bill[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markPaid(id: string) {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from('bills').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id),
      supabase.from('transactions').insert({
        user_id: user.id,
        description: bill.description,
        amount: bill.amount,
        type: bill.type === 'pagar' ? 'despesa' : 'receita',
        date: new Date().toISOString().split('T')[0],
        category_id: bill.category_id,
        is_recurring: bill.is_recurring,
      }),
    ]);
    load();
  }

  async function markUnpaid() {
    if (!undoTarget) return;
    setUndoing(true);
    const b = undoTarget;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUndoing(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const newStatus = b.due_date < today ? 'late' : 'pending';

    // Try to find and remove the matching transaction (created when bill was paid)
    const paidDate = b.paid_at ? b.paid_at.split('T')[0] : today;
    const txType = b.type === 'pagar' ? 'despesa' : 'receita';
    const { data: matches } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('description', b.description)
      .eq('amount', b.amount)
      .eq('type', txType)
      .eq('date', paidDate)
      .limit(2);

    if (matches && matches.length === 1) {
      await supabase.from('transactions').delete().eq('id', (matches[0] as any).id);
    }
    await supabase.from('bills').update({ status: newStatus, paid_at: null }).eq('id', b.id);
    setUndoing(false);
    setUndoTarget(null);
    load();
  }

  const list = bills.filter((b) => b.type === tab);
  const pending = list.filter((b) => b.status !== 'paid');
  const tot = pending.reduce((s, b) => s + Number(b.amount), 0);
  const late = list.filter((b) => b.status === 'late').length;

  return (
    <>
      <div className="ff-enter mb-5">
        <h1 className="text-2xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          Contas
        </h1>
        <p className="text-xs text-muted mt-0.5">Contas a pagar e receber</p>
      </div>

      {/* Tab switcher */}
      <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-4">
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
          style={{ left: tab === 'pagar' ? 4 : 'calc(50%)' }}
        />
        {([['pagar', 'A pagar', 'ti-arrow-up-right'], ['receber', 'A receber', 'ti-arrow-down-right']] as const).map(([k, label, icon]) => {
          const count = bills.filter((b) => b.type === k && b.status !== 'paid').length;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: tab === k ? 'var(--c-ink)' : 'var(--c-muted)', fontFamily: 'inherit' }}
            >
              <i className={`ti ${icon} text-sm`} /> {label}
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: tab === k ? 'var(--c-brand-soft)' : 'var(--c-border)', color: tab === k ? 'var(--c-brand)' : 'var(--c-muted)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label="Em aberto" value={tot} tone={tab === 'pagar' ? 'danger' : 'success'} />
        <div className="bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
          <span className="text-[11px] text-muted font-medium uppercase tracking-wider">Atrasados</span>
          <div className="num text-[22px] font-semibold text-ink"
               style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            {late}
          </div>
        </div>
      </div>

      <Link
        href="/contas/nova"
        className="press mb-4 flex items-center justify-center gap-1.5 w-full py-3.5 rounded-pill text-sm font-semibold"
        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}
      >
        <i className="ti ti-plus" /> Nova conta
      </Link>

      {loading ? (
        <div className="text-center py-8 text-muted text-sm">Carregando...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">Nenhuma conta cadastrada.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((b) => (
            <BillRow key={b.id} bill={b} tab={tab}
                     onPay={() => markPaid(b.id)}
                     onUndo={() => setUndoTarget(b)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!undoTarget}
        title="Desfazer pagamento?"
        message={undoTarget
          ? `A conta "${undoTarget.description}" volta a ficar em aberto e o lançamento correspondente será removido (se houver).`
          : ''}
        confirmLabel="Desfazer"
        loading={undoing}
        onConfirm={markUnpaid}
        onCancel={() => setUndoTarget(null)}
      />
    </>
  );
}

function BillRow({ bill: b, tab, onPay, onUndo }: { bill: Bill; tab: 'pagar' | 'receber'; onPay: () => void; onUndo: () => void }) {
  const isLate = b.status === 'late';
  const isPaid = b.status === 'paid';

  return (
    <div className={cn(
      'ff-row flex items-center gap-3 p-3.5 rounded-md border',
      isLate ? 'bg-danger-soft border-danger/30' : 'bg-card border-border',
      isPaid && 'opacity-50'
    )}>
      <div className="w-[38px] h-[38px] rounded-xl grid place-items-center shrink-0"
           style={{ background: isLate ? 'var(--c-danger-soft)' : 'var(--c-brand-soft)', color: isLate ? 'var(--c-danger)' : 'var(--c-brand)' }}>
        <i className={`ti ${isPaid ? 'ti-check' : isLate ? 'ti-alert-circle' : 'ti-receipt-2'} text-lg`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink flex items-center gap-1.5 truncate">
          {b.description}
          {b.is_recurring && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                  style={{ background: 'var(--c-brand-soft)', color: 'var(--c-brand)' }}>
              recorrente
            </span>
          )}
        </p>
        <p className={cn('text-[11px] mt-0.5', isLate ? 'text-danger' : 'text-muted')}>
          {isPaid ? 'Pago' : isLate ? `Atrasado · venceu ${fmtDate(b.due_date)}` : `Vence em ${fmtDate(b.due_date)}`}
        </p>
      </div>
      {!isPaid ? (
        <button
          onClick={onPay}
          className="press shrink-0 text-xs px-3 py-2 border border-border rounded-md font-medium text-ink bg-card"
          style={{ fontFamily: 'inherit' }}
        >
          {fmtBRL(Number(b.amount))} · {tab === 'pagar' ? 'pagar' : 'receber'}
        </button>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <div className="num text-[13px] font-semibold text-ink" style={{ letterSpacing: '-0.02em' }}>
            {fmtBRL(Number(b.amount))}
          </div>
          <button onClick={onUndo}
                  aria-label="Desfazer pagamento"
                  className="press w-7 h-7 rounded-full grid place-items-center border-none cursor-pointer"
                  style={{ background: 'var(--c-border-2)', color: 'var(--c-muted)' }}>
            <i className="ti ti-rotate-2 text-xs" />
          </button>
        </div>
      )}
    </div>
  );
}
