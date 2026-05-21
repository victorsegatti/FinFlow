import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, addDays, format } from 'date-fns';

export const MODEL = 'claude-sonnet-4-6';

export function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: key });
}

export const SYSTEM_PROMPT = `Você é um consultor financeiro pessoal brasileiro do app FinFlow.

Seu papel:
- Analisar gastos, receitas, contas e metas do usuário com clareza e empatia
- Sugerir melhorias práticas, nunca julgar
- Falar valores em R$ (formato brasileiro: R$ 1.234,56)
- Ser direto e curto — nada de parágrafos longos
- Quando dar sugestões, ancore em dados reais que aparecem no contexto
- Use português brasileiro informal mas profissional

Glossário do app:
- "Lançamentos" = transações já realizadas (entram/saem do saldo na hora)
- "Contas" = compromissos com data de vencimento, podem estar pending/late/paid; quando paid, viraram lançamentos
- "Previsto" = soma de todas as contas do mês (independente do status)
- "Realizado" = soma dos lançamentos do mês

Restrições:
- Nunca invente números — só use os que aparecem no contexto
- Nunca recomende produtos financeiros específicos (corretoras, bancos, ações)
- Se a pergunta sai do escopo de finanças pessoais, redirecione gentilmente
- Nunca prometa retornos ou faça projeções de investimento`;

export type FinancialContext = {
  monthLabel: string;
  receitas: number;
  despesas: number;
  saldo: number;
  prevReceitas: number;
  prevDespesas: number;
  // Previsão de contas do mês
  billsPagarTotal: number;
  billsPagarPaid: number;
  billsPagarPending: number;
  billsPagarLate: number;
  billsReceberTotal: number;
  billsReceberPaid: number;
  billsReceberPending: number;
  byCategory: { name: string; spent: number; budget?: number }[];
  txs: { date: string; description: string; amount: number; type: string; category?: string }[];
  bills: { description: string; amount: number; due_date: string; status: string; type: string; is_recurring: boolean }[];
  upcomingBills: { description: string; amount: number; due_date: string; status: string; type: string }[];
};

export async function buildFinancialContext(): Promise<FinancialContext> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const upcomingEnd = format(addDays(now, 60), 'yyyy-MM-dd');

  const [{ data: txs }, { data: prevTxs }, { data: goals }, { data: monthBills }, { data: upcoming }] = await Promise.all([
    supabase.from('transactions').select('*, category:categories(*)').gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false }),
    supabase.from('transactions').select('amount, type, category_id').gte('date', prevStart).lte('date', prevEnd),
    supabase.from('goals').select('*, category:categories(*)').eq('type', 'budget'),
    // TODAS as contas com vencimento no mês atual (independente de status)
    supabase.from('bills').select('description, amount, due_date, status, type, is_recurring').gte('due_date', monthStart).lte('due_date', monthEnd).order('due_date'),
    // Contas dos próximos 60 dias FORA do mês atual (em aberto)
    supabase.from('bills').select('description, amount, due_date, status, type').gt('due_date', monthEnd).lte('due_date', upcomingEnd).neq('status', 'paid').order('due_date'),
  ]);

  const transactions = txs || [];
  const prev = prevTxs || [];
  const allMonthBills = monthBills || [];

  const receitas = transactions.filter((t: any) => t.type === 'receita').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const despesas = transactions.filter((t: any) => t.type === 'despesa').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const prevReceitas = prev.filter((t: any) => t.type === 'receita').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const prevDespesas = prev.filter((t: any) => t.type === 'despesa').reduce((s: number, t: any) => s + Number(t.amount), 0);

  const sum = (rows: any[], filter: (b: any) => boolean) =>
    rows.filter(filter).reduce((s, b) => s + Number(b.amount), 0);

  const billsPagarTotal = sum(allMonthBills, (b) => b.type === 'pagar');
  const billsPagarPaid = sum(allMonthBills, (b) => b.type === 'pagar' && b.status === 'paid');
  const billsPagarPending = sum(allMonthBills, (b) => b.type === 'pagar' && b.status === 'pending');
  const billsPagarLate = sum(allMonthBills, (b) => b.type === 'pagar' && b.status === 'late');
  const billsReceberTotal = sum(allMonthBills, (b) => b.type === 'receber');
  const billsReceberPaid = sum(allMonthBills, (b) => b.type === 'receber' && b.status === 'paid');
  const billsReceberPending = sum(allMonthBills, (b) => b.type === 'receber' && b.status !== 'paid');

  const spentByCat: Record<string, { name: string; spent: number; budget?: number }> = {};
  for (const t of transactions) {
    if (t.type !== 'despesa') continue;
    const name = (t as any).category?.name || 'Sem categoria';
    const id = t.category_id || 'none';
    if (!spentByCat[id]) spentByCat[id] = { name, spent: 0 };
    spentByCat[id].spent += Number(t.amount);
  }
  for (const g of goals || []) {
    const id = (g as any).category_id || 'none';
    if (spentByCat[id]) spentByCat[id].budget = Number((g as any).target_amount);
    else spentByCat[id] = { name: (g as any).category?.name || (g as any).name, spent: 0, budget: Number((g as any).target_amount) };
  }

  return {
    monthLabel: format(now, 'MMMM yyyy'),
    receitas, despesas,
    saldo: receitas - despesas,
    prevReceitas, prevDespesas,
    billsPagarTotal, billsPagarPaid, billsPagarPending, billsPagarLate,
    billsReceberTotal, billsReceberPaid, billsReceberPending,
    byCategory: Object.values(spentByCat).sort((a, b) => b.spent - a.spent),
    txs: transactions.map((t: any) => ({
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      category: t.category?.name,
    })),
    bills: allMonthBills.map((b: any) => ({
      description: b.description,
      amount: Number(b.amount),
      due_date: b.due_date,
      status: b.status,
      type: b.type,
      is_recurring: !!b.is_recurring,
    })),
    upcomingBills: (upcoming || []).map((b: any) => ({
      description: b.description,
      amount: Number(b.amount),
      due_date: b.due_date,
      status: b.status,
      type: b.type,
    })),
  };
}

export function fmtCtx(ctx: FinancialContext): string {
  const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines: string[] = [];

  lines.push(`## Resumo do mês atual (${ctx.monthLabel})`);
  lines.push(`- Receitas realizadas: ${fmt(ctx.receitas)} (mês anterior: ${fmt(ctx.prevReceitas)})`);
  lines.push(`- Despesas realizadas: ${fmt(ctx.despesas)} (mês anterior: ${fmt(ctx.prevDespesas)})`);
  lines.push(`- Saldo realizado: ${fmt(ctx.saldo)}`);
  lines.push('');

  lines.push(`## Contas do mês — previsto vs realizado`);
  lines.push(`Contas a pagar do mês: previsto ${fmt(ctx.billsPagarTotal)} (pagas ${fmt(ctx.billsPagarPaid)}, pendentes ${fmt(ctx.billsPagarPending)}, atrasadas ${fmt(ctx.billsPagarLate)})`);
  lines.push(`Contas a receber do mês: previsto ${fmt(ctx.billsReceberTotal)} (recebidas ${fmt(ctx.billsReceberPaid)}, em aberto ${fmt(ctx.billsReceberPending)})`);
  lines.push(`Saldo previsto do mês: ${fmt(ctx.billsReceberTotal - ctx.billsPagarTotal)}`);
  lines.push('');

  if (ctx.bills.length > 0) {
    lines.push(`## Todas as contas do mês (${ctx.bills.length})`);
    for (const b of ctx.bills) {
      const rec = b.is_recurring ? ' [recorrente]' : '';
      lines.push(`- ${b.due_date} | ${b.type} | ${b.description}: ${fmt(b.amount)} | status: ${b.status}${rec}`);
    }
    lines.push('');
  }

  if (ctx.upcomingBills.length > 0) {
    lines.push(`## Contas dos próximos 60 dias (fora do mês atual, em aberto)`);
    for (const b of ctx.upcomingBills) {
      lines.push(`- ${b.due_date} | ${b.type} | ${b.description}: ${fmt(b.amount)} | status: ${b.status}`);
    }
    lines.push('');
  }

  if (ctx.byCategory.length > 0) {
    lines.push(`## Gastos por categoria (mês atual)`);
    for (const c of ctx.byCategory) {
      const budgetInfo = c.budget != null ? ` (orçamento: ${fmt(c.budget)})` : '';
      lines.push(`- ${c.name}: ${fmt(c.spent)}${budgetInfo}`);
    }
    lines.push('');
  }

  if (ctx.txs.length > 0) {
    lines.push(`## Lançamentos do mês (${ctx.txs.length} no total)`);
    for (const t of ctx.txs) {
      const sign = t.type === 'receita' ? '+' : '-';
      lines.push(`- ${t.date} | ${t.description} | ${sign}${fmt(t.amount)} | ${t.category || 'sem cat'}`);
    }
  } else {
    lines.push(`## Lançamentos do mês: nenhum`);
  }

  return lines.join('\n');
}
