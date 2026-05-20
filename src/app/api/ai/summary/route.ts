import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { getClient, MODEL, SYSTEM_PROMPT, buildFinancialContext, fmtCtx } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const ctx = await buildFinancialContext();
    if (ctx.receitas === 0 && ctx.despesas === 0) {
      return NextResponse.json({ insight: 'Adicione alguns lançamentos pra eu poder analisar.' });
    }

    const client = getClient();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Aqui está minha situação financeira:\n\n${fmtCtx(ctx)}\n\nMe dê UM insight curto (1-2 frases, máximo 200 caracteres) sobre o que mais chama atenção neste mês. Seja específico com valores. Sem introdução, sem "olá", direto ao ponto.`,
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return NextResponse.json({ insight: text });
  } catch (e: any) {
    console.error('AI summary error:', e);
    return NextResponse.json({ error: e?.message || 'erro' }, { status: 500 });
  }
}
