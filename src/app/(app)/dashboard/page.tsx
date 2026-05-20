import { createClient } from '@/lib/supabase/server';
import { TxRow } from '@/components/tx-row';
import { MetricCard, BigBalanceCard } from '@/components/metric-card';
import { TopHeader } from '@/components/top-header';
import { AIInsightCard } from '@/components/ai-insight-card';
import { Transaction, Bill } from '@/types/database';
import Link from 'next/link';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const [{ data: { user } }, { data: txs }, { data: bills }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false }),
    supabase
      .from('bills')
      .select('*')
      .neq('status', 'paid'),
  ]);

  const userName = user?.email?.split('@')[0] || 'usuário';
  const firstName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const transactions = (txs || []) as Transaction[];
  const bs = (bills || []) as Bill[];

  const receitas = transactions.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
  const despesas = transactions.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
  const saldo = receitas - despesas;

  // deltaPct: compare saldo vs receitas as proxy (no prior month data available)
  const deltaPct = receitas > 0 ? ((saldo / receitas) * 100 - 50) : 0;

  const overdueCount = bs.filter((b) => b.status === 'late').length;
  const dueSoonCount = bs.filter((b) => b.status === 'pending').length;
  const overdueTotal = bs
    .filter((b) => b.status === 'late' || b.status === 'pending')
    .reduce((s, b) => s + Number(b.amount), 0);

  const recent = transactions.slice(0, 10);

  const subtitle = format(now, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div style={{ padding: '8px 0 140px' }}>
      <TopHeader title={`Olá, ${firstName}`} subtitle={subtitle} />

      <BigBalanceCard value={saldo} deltaPct={deltaPct} />

      <AIInsightCard />

      {/* metric cards */}
      <div className="grid grid-cols-2 gap-2.5 mt-3.5">
        <MetricCard label="Receitas" value={receitas} icon="ti-arrow-up-right" tone="success" deltaPct={0} />
        <MetricCard label="Despesas" value={despesas} icon="ti-arrow-down-right" tone="danger" deltaPct={0} />
      </div>

      {/* alert card — overdue bills */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <Link href="/contas" style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'var(--c-card)',
          border: '1px solid var(--c-border)',
          borderLeft: '3px solid var(--c-warning)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
          textDecoration: 'none',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--c-warning-soft)', color: 'var(--c-warning)',
            display: 'grid', placeItems: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-alert-triangle" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-ink)' }}>
              {overdueCount > 0 && `${overdueCount} conta${overdueCount > 1 ? 's' : ''} atrasada${overdueCount > 1 ? 's' : ''}`}
              {overdueCount > 0 && dueSoonCount > 0 && ' · '}
              {dueSoonCount > 0 && `${dueSoonCount} vence${dueSoonCount > 1 ? 'm' : ''} em breve`}
            </div>
            <div className="num" style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 1 }}>
              Total: {overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--c-faint)' }} />
        </Link>
      )}

      {/* quick actions */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 4px 12px',
        }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--c-ink)',
                       textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acessar</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { icon: 'ti-arrows-exchange', label: 'Transferir', href: null },
            { icon: 'ti-receipt-2',       label: 'Contas',     href: '/contas' },
            { icon: 'ti-target-arrow',    label: 'Metas',      href: '/metas' },
            { icon: 'ti-chart-pie',       label: 'Relatório',  href: null },
          ].map((q) => {
            const inner = (
              <>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--c-brand-soft)', color: 'var(--c-brand)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <i className={`ti ${q.icon}`} style={{ fontSize: 18 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--c-ink-2)', fontWeight: 500 }}>{q.label}</span>
              </>
            );
            const sharedStyle = {
              display: 'flex' as const, flexDirection: 'column' as const,
              alignItems: 'center' as const, gap: 6,
              padding: '14px 4px',
              borderRadius: 'var(--r-md)',
              background: 'var(--c-card)',
              border: '1px solid var(--c-border)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'none',
            };
            return q.href ? (
              <Link key={q.label} href={q.href} className="press" style={sharedStyle}>
                {inner}
              </Link>
            ) : (
              <button key={q.label} className="press" style={sharedStyle}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>

      {/* recent transactions */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          padding: '0 4px 12px',
        }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--c-ink)',
                       textTransform: 'uppercase', letterSpacing: '0.06em' }}>Últimas transações</h3>
          <Link href="/lancamentos" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--c-brand)', fontWeight: 500, textDecoration: 'none',
          }}>Ver tudo</Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--c-muted)' }}>
            Nenhum lançamento ainda.{' '}
            <Link href="/lancamentos/novo" style={{ color: 'var(--c-brand)' }}>Criar o primeiro</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.map((t) => <TxRow key={t.id} tx={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
