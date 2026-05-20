'use client';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Msg = { role: 'user' | 'assistant'; content: string };

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: `Erro: ${j.error || r.statusText}` };
          return copy;
        });
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      // Track placeholder positions of pending tool actions by tool id
      const pending: Record<string, { name: string; input: any; placeholder: string }> = {};

      const fmtBRL = (n: number) =>
        typeof n === 'number'
          ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '';

      const labelForTool = (name: string, input: any) => {
        if (name === 'create_transaction') {
          return `Criando lançamento "${input?.description ?? ''}" ${fmtBRL(input?.amount)}…`;
        }
        if (name === 'create_bill') {
          return `Criando conta "${input?.description ?? ''}" ${fmtBRL(input?.amount)} (vence ${input?.due_date ?? ''})…`;
        }
        if (name === 'create_goal') {
          return `Criando meta "${input?.name ?? ''}" ${fmtBRL(input?.target_amount)}…`;
        }
        return `Executando ${name}…`;
      };

      const flush = () => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      };

      const handleLine = (line: string) => {
        if (!line.trim()) return;
        let evt: any;
        try { evt = JSON.parse(line); } catch { return; }
        if (evt.t === 'text') {
          acc += evt.v || '';
        } else if (evt.t === 'tool_start') {
          const placeholder = `\n\n> ➤ ${labelForTool(evt.name, evt.input)}\n\n`;
          pending[evt.id] = { name: evt.name, input: evt.input, placeholder };
          acc += placeholder;
        } else if (evt.t === 'tool_result') {
          const p = pending[evt.id];
          const marker = evt.ok ? '✓' : '✗';
          const resolved = `\n\n> ${marker} ${evt.summary || (evt.ok ? 'ok' : 'erro')}\n\n`;
          if (p && acc.includes(p.placeholder)) {
            acc = acc.replace(p.placeholder, resolved);
          } else {
            acc += resolved;
          }
          delete pending[evt.id];
        } else if (evt.t === 'end') {
          // no-op
        }
        flush();
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          handleLine(line);
        }
      }
      // flush remaining buffered line, if any
      if (buf.trim()) handleLine(buf);
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `Erro: ${e?.message || 'falha'}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button — positioned above bottom nav */}
      {!open && (
        <button onClick={() => setOpen(true)}
                aria-label="Abrir assistente"
                className="press fixed z-30 grid place-items-center border-none cursor-pointer shadow-3"
                style={{
                  bottom: 96, right: 16, width: 52, height: 52,
                  borderRadius: 999,
                  background: 'var(--c-brand)', color: 'var(--c-brand-fg)',
                  boxShadow: '0 8px 20px -4px var(--c-brand)',
                }}>
          <i className="ti ti-sparkles text-2xl" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="ff-backdrop absolute inset-0 cursor-pointer" onClick={() => setOpen(false)}
               style={{ background: 'rgba(10,15,12,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="ff-sheet relative bg-bg-elev rounded-t-[28px] flex flex-col"
               style={{ height: '85vh', boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }}>
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] grid place-items-center"
                     style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
                  <i className="ti ti-sparkles text-base" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>FinAI</div>
                  <div className="text-[10px] text-muted">Pergunte, crie e analise</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                      className="press w-8 h-8 rounded-full grid place-items-center bg-border-2 text-ink-2 border-none cursor-pointer">
                <i className="ti ti-x text-sm" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted mb-4">Pergunte qualquer coisa sobre suas finanças.</p>
                  <div className="flex flex-col gap-2">
                    {[
                      'Onde estou gastando mais esse mês?',
                      'Posso gastar R$ 500 com viagem?',
                      'Como está meu saldo comparado ao mês passado?',
                    ].map((q) => (
                      <button key={q} onClick={() => { setInput(q); }}
                              className="press text-xs text-left p-3 bg-card border border-border rounded-md text-ink-2">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className="flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ai-md"
                       style={{
                         background: m.role === 'user' ? 'var(--c-brand)' : 'var(--c-card)',
                         color: m.role === 'user' ? 'var(--c-brand-fg)' : 'var(--c-ink)',
                         border: m.role === 'user' ? 'none' : '1px solid var(--c-border)',
                       }}>
                    {m.content ? (
                      m.role === 'user'
                        ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                        : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    ) : (streaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-muted)' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-muted)', animationDelay: '0.15s' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-muted)', animationDelay: '0.3s' }} />
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-border shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); send(); }}
                    className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte algo…"
                  disabled={streaming}
                  className="flex-1 h-11 px-4 bg-card border border-border rounded-pill text-sm text-ink outline-none focus:border-brand"
                  style={{ fontFamily: 'inherit' }}
                />
                <button type="submit" disabled={streaming || !input.trim()}
                        className="press w-11 h-11 rounded-full grid place-items-center border-none cursor-pointer disabled:opacity-40"
                        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}
                        aria-label="Enviar">
                  <i className="ti ti-arrow-up text-base" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
