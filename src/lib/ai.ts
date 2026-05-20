import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const MODEL = 'claude-sonnet-4-6';

export function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: key });
}

export const SYSTEM_PROMPT = `Você é um consultor financeiro pessoal brasileiro do app FinFlow.

Seu papel:
- Analisar gastos e receitas do usuário com clareza e empatia
- Sugerir melhorias práticas, nunca julgar
- Falar valores em R$ (formato brasileiro: R$ 1.234,56)
- Ser direto e curto — nada de parágrafos longos
- Quando dar sugestões, ancore em dados reais que aparecem no contexto
- Use português brasileiro informal mas profissional

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
  byCategory: { name: string; spent: number; budget?: number }[];
  recentTxs: { date: string; description: string; amount: number; type: string; category?: string }[];
  bills: { description: string; amount: number; due_date: string; status: string }[];
};

export async function buildFinancialContext(): Promise<FinancialContext> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  const [{ data: txs }, { data: prevTxs }, { data: goals }, { data: bills }] = await Promise.all([
    supabase.from('transactions').select('*, category:categories(*)').gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false }),
    supabase.from('transactions').select('amount, type, category_id').gte('date', prevStart).lte('date', prevEnd),
    supabase.from('goals').select('*, category:categories(*)').eq('type', 'budget'),
    supabase.from('bills').select('description, amount, due_date, status').neq('status', 'paid').order('due_date'),
  ]);

  const transactions = txs || [];
  const prev = prevTxs || [];

  const receitas = transactions.filter((t: any) => t.type === 'receita').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const despesas = transactions.filter((t: any) => t.type === 'despesa').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const prevReceitas = prev.filter((t: any) => t.type === 'receita').reduce((s: number, t: any) => s + Number(t.amount), 0);
  const prevDespesas = prev.filter((t: any) => t.type === 'despesa').reduce((s: number, t: any) => s + Number(t.amount), 0);

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
    receitas,
    despesas,
    saldo: receitas - despesas,
    prevReceitas,
    prevDespesas,
    byCategory: Object.values(spentByCat).sort((a, b) => b.spent - a.spent),
    recentTxs: transactions.slice(0, 30).map((t: any) => ({
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      category: t.category?.name,
    })),
    bills: (bills || []).map((b: any) => ({
      description: b.description,
      amount: Number(b.amount),
      due_date: b.due_date,
      status: b.status,
    })),
  };
}

export function fmtCtx(ctx: FinancialContext): string {
  const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines: string[] = [];
  lines.push(`## Mês atual: ${ctx.monthLabel}`);
  lines.push(`- Receitas: ${fmt(ctx.receitas)}`);
  lines.push(`- Despesas: ${fmt(ctx.despesas)}`);
  lines.push(`- Saldo: ${fmt(ctx.saldo)}`);
  lines.push('');
  lines.push(`## Mês anterior`);
  lines.push(`- Receitas: ${fmt(ctx.prevReceitas)}`);
  lines.push(`- Despesas: ${fmt(ctx.prevDespesas)}`);
  lines.push('');
  lines.push(`## Gastos por categoria (mês atual)`);
  for (const c of ctx.byCategory) {
    const budgetInfo = c.budget != null ? ` (orçamento: ${fmt(c.budget)})` : '';
    lines.push(`- ${c.name}: ${fmt(c.spent)}${budgetInfo}`);
  }
  if (ctx.bills.length > 0) {
    lines.push('');
    lines.push(`## Contas em aberto`);
    for (const b of ctx.bills.slice(0, 10)) {
      lines.push(`- ${b.description}: ${fmt(b.amount)} (vence ${b.due_date}, status: ${b.status})`);
    }
  }
  lines.push('');
  lines.push(`## Últimos lançamentos (até 30)`);
  for (const t of ctx.recentTxs) {
    const sign = t.type === 'receita' ? '+' : '-';
    lines.push(`- ${t.date} | ${t.description} | ${sign}${fmt(t.amount)} | ${t.category || 'sem cat'}`);
  }
  return lines.join('\n');
}
