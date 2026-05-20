import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getClient, MODEL, SYSTEM_PROMPT, buildFinancialContext, fmtCtx } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Nome da categoria existente nos dados' },
          suggested_amount: { type: 'number', description: 'Limite mensal sugerido em reais' },
          reasoning: { type: 'string', description: 'Justificativa curta em 1 frase, ancorada nos dados' },
        },
        required: ['category', 'suggested_amount', 'reasoning'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string', description: 'Resumo geral curto, máximo 200 caracteres' },
  },
  required: ['suggestions', 'summary'],
  additionalProperties: false,
} as const;

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const ctx = await buildFinancialContext();
    if (ctx.despesas === 0) {
      return NextResponse.json({ error: 'Sem despesas registradas pra analisar' }, { status: 400 });
    }

    const client = getClient();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA as any },
      },
      messages: [
        {
          role: 'user',
          content: `Aqui estão meus dados financeiros:\n\n${fmtCtx(ctx)}\n\nMe sugira orçamentos mensais realistas pra cada categoria de despesa relevante. Considere o gasto médio entre mês atual e anterior, mas com uma margem razoável (não sufoque). Máximo 6 sugestões, focadas nas categorias com maior gasto. Use os nomes EXATOS de categoria que aparecem nos dados.`,
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error('AI budgets error:', e);
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
