import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getClient, MODEL, SYSTEM_PROMPT, buildFinancialContext, fmtCtx } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { buildRecurringDates } from '@/lib/recurrence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const TOOL_USE_SYSTEM = `${SYSTEM_PROMPT}

Ações disponíveis (use as tools quando o usuário pedir explicitamente para criar/registrar algo):
- create_transaction: registra um lançamento (receita ou despesa) já realizado em uma data.
- create_bill: cria uma conta a pagar ou a receber com vencimento; pode ser recorrente (12 meses).
- create_goal: cria uma meta de orçamento (budget por categoria) ou de poupança (savings).

Diretrizes para tools:
- Só use as tools quando o pedido for explícito (ex: "registra um gasto de R$50 com mercado hoje", "cria uma conta de luz pra dia 10", "cria meta de R$800 pra mercado").
- Para datas relativas (hoje, amanhã, segunda), converta para yyyy-MM-dd antes de chamar.
- amount é sempre em reais (number positivo).
- Depois de executar a tool, confirme em prosa curta o que foi criado.
- Se faltar info essencial (valor, data), pergunte antes de chamar a tool.`;

// Tool schemas (typed as any to keep flexibility with SDK version)
const TOOLS: any[] = [
  {
    name: 'create_transaction',
    description: 'Registra um lançamento financeiro (receita ou despesa) já realizado.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descrição curta do lançamento.' },
        amount: { type: 'number', description: 'Valor em reais (positivo).' },
        type: { type: 'string', enum: ['receita', 'despesa'] },
        date: { type: 'string', description: 'Data no formato yyyy-MM-dd.' },
        category: { type: 'string', description: 'Nome da categoria (opcional).' },
      },
      required: ['description', 'amount', 'type', 'date'],
    },
  },
  {
    name: 'create_bill',
    description: 'Cria uma conta a pagar ou a receber com data de vencimento.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        amount: { type: 'number' },
        type: { type: 'string', enum: ['pagar', 'receber'] },
        due_date: { type: 'string', description: 'Data no formato yyyy-MM-dd.' },
        category: { type: 'string' },
        is_recurring: { type: 'boolean', description: 'Se true, cria 12 ocorrências mensais.' },
      },
      required: ['description', 'amount', 'type', 'due_date'],
    },
  },
  {
    name: 'create_goal',
    description: 'Cria uma meta — budget (orçamento por categoria) ou savings (poupança).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        target_amount: { type: 'number' },
        type: { type: 'string', enum: ['budget', 'savings'] },
        category: { type: 'string', description: 'Nome da categoria (recomendado para budget).' },
      },
      required: ['name', 'target_amount', 'type'],
    },
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ExecResult = { ok: boolean; summary: string };

async function findCategoryId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  name: string | undefined,
): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .limit(1);
  if (data && data.length > 0) return (data[0] as any).id as string;
  // fallback: ilike with wildcards
  const { data: data2 } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`)
    .limit(1);
  if (data2 && data2.length > 0) return (data2[0] as any).id as string;
  return null;
}

async function execTool(
  name: string,
  input: any,
  userId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<ExecResult> {
  try {
    if (name === 'create_transaction') {
      const { description, amount, type, date, category } = input || {};
      if (!description || typeof description !== 'string') return { ok: false, summary: 'descrição inválida' };
      if (typeof amount !== 'number' || !(amount > 0)) return { ok: false, summary: 'valor deve ser maior que zero' };
      if (type !== 'receita' && type !== 'despesa') return { ok: false, summary: 'tipo inválido' };
      if (typeof date !== 'string' || !DATE_RE.test(date)) return { ok: false, summary: 'data deve estar em yyyy-MM-dd' };
      const category_id = await findCategoryId(supabase, userId, category);
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        description,
        amount,
        type,
        date,
        category_id,
        is_recurring: false,
      });
      if (error) return { ok: false, summary: error.message };
      return {
        ok: true,
        summary: `Lançamento criado: ${description} ${fmtBRL(amount)} (${type}) em ${date}${category_id ? ` na categoria ${category}` : ''}.`,
      };
    }

    if (name === 'create_bill') {
      const { description, amount, type, due_date, category, is_recurring } = input || {};
      if (!description || typeof description !== 'string') return { ok: false, summary: 'descrição inválida' };
      if (typeof amount !== 'number' || !(amount > 0)) return { ok: false, summary: 'valor deve ser maior que zero' };
      if (type !== 'pagar' && type !== 'receber') return { ok: false, summary: 'tipo inválido' };
      if (typeof due_date !== 'string' || !DATE_RE.test(due_date)) return { ok: false, summary: 'data deve estar em yyyy-MM-dd' };
      const category_id = await findCategoryId(supabase, userId, category);
      const recurring = !!is_recurring;
      const dates = recurring ? buildRecurringDates(due_date) : [due_date];
      const rows = dates.map((d) => ({
        user_id: userId,
        description,
        amount,
        type,
        due_date: d,
        category_id,
        is_recurring: recurring,
        status: 'pending',
      }));
      const { error } = await supabase.from('bills').insert(rows);
      if (error) return { ok: false, summary: error.message };
      return {
        ok: true,
        summary: recurring
          ? `Conta recorrente criada: ${description} ${fmtBRL(amount)} (${type}) — ${rows.length} ocorrências começando em ${due_date}.`
          : `Conta criada: ${description} ${fmtBRL(amount)} (${type}) com vencimento em ${due_date}.`,
      };
    }

    if (name === 'create_goal') {
      const { name: gname, target_amount, type, category } = input || {};
      if (!gname || typeof gname !== 'string') return { ok: false, summary: 'nome inválido' };
      if (typeof target_amount !== 'number' || !(target_amount > 0)) return { ok: false, summary: 'valor deve ser maior que zero' };
      if (type !== 'budget' && type !== 'savings') return { ok: false, summary: 'tipo inválido' };
      const category_id = await findCategoryId(supabase, userId, category);
      const { error } = await supabase.from('goals').insert({
        user_id: userId,
        name: gname,
        target_amount,
        type,
        category_id,
        period: 'monthly',
      });
      if (error) return { ok: false, summary: error.message };
      return {
        ok: true,
        summary: `Meta criada: ${gname} ${fmtBRL(target_amount)} (${type})${category_id ? ` na categoria ${category}` : ''}.`,
      };
    }

    return { ok: false, summary: `tool desconhecida: ${name}` };
  } catch (e: any) {
    return { ok: false, summary: e?.message || 'erro ao executar tool' };
  }
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const history = (body.messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20);
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'last message must be from user' }, { status: 400 });
  }

  try {
    const ctx = await buildFinancialContext();
    const client = getClient();

    const systemBlocks: any[] = [
      { type: 'text', text: TOOL_USE_SYSTEM },
      {
        type: 'text',
        text: `Dados financeiros atualizados do usuário:\n\n${fmtCtx(ctx)}\n\nData de hoje: ${new Date().toISOString().slice(0, 10)}`,
        cache_control: { type: 'ephemeral' },
      },
    ];

    // running messages array compatible with SDK
    const runMessages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        try {
          const MAX_ITER = 5;
          for (let iter = 0; iter < MAX_ITER; iter++) {
            const stream = client.messages.stream({
              model: MODEL,
              max_tokens: 1024,
              system: systemBlocks,
              tools: TOOLS,
              messages: runMessages,
            });

            // Track tool_use blocks being assembled
            const toolBlocks: Record<number, { id: string; name: string; input_json: string }> = {};

            for await (const event of stream as any) {
              if (event.type === 'content_block_start') {
                const block = event.content_block;
                if (block?.type === 'tool_use') {
                  toolBlocks[event.index] = { id: block.id, name: block.name, input_json: '' };
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  send({ t: 'text', v: event.delta.text });
                } else if (event.delta.type === 'input_json_delta') {
                  const tb = toolBlocks[event.index];
                  if (tb) tb.input_json += event.delta.partial_json || '';
                }
              } else if (event.type === 'content_block_stop') {
                const tb = toolBlocks[event.index];
                if (tb) {
                  let parsed: any = {};
                  try { parsed = tb.input_json ? JSON.parse(tb.input_json) : {}; } catch { parsed = {}; }
                  send({ t: 'tool_start', name: tb.name, input: parsed, id: tb.id });
                }
              }
            }

            const finalMsg = await stream.finalMessage();

            // Add assistant turn
            runMessages.push({ role: 'assistant', content: finalMsg.content as any });

            if (finalMsg.stop_reason !== 'tool_use') {
              break;
            }

            // Execute each tool_use
            const toolResults: any[] = [];
            for (const block of finalMsg.content as any[]) {
              if (block.type !== 'tool_use') continue;
              const result = await execTool(block.name, block.input, user.id, supabase);
              send({ t: 'tool_result', id: block.id, ok: result.ok, summary: result.summary });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.summary,
                is_error: !result.ok,
              });
            }
            runMessages.push({ role: 'user', content: toolResults as any });
          }

          send({ t: 'end' });
          controller.close();
        } catch (e: any) {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ t: 'text', v: `\n\n[erro: ${e?.message || 'falha'}]` }) + '\n'));
            controller.enqueue(encoder.encode(JSON.stringify({ t: 'end' }) + '\n'));
          } catch {}
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e: any) {
    console.error('AI chat error:', e);
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
