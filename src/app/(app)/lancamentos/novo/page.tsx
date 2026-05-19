'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';
import { parseBRLInput, cn } from '@/lib/format';
import { format } from 'date-fns';

export default function NovoLancamentoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cats, setCats] = useState<Category[]>([]);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [catId, setCatId] = useState<string>('');
  const [recur, setRecur] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('*');
      setCats((data || []) as Category[]);
    })();
  }, [supabase]);

  async function handleSave() {
    if (!desc || !valor) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const amount = parseBRLInput(valor);
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      description: desc,
      amount,
      type: tipo,
      date: data,
      category_id: catId || null,
      is_recurring: recur,
    });

    setSaving(false);
    if (error) return alert(error.message);
    router.push('/lancamentos');
    router.refresh();
  }

  const filtered = cats.filter((c) => c.type === tipo || c.type === 'ambos');

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <h1 className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Novo lançamento
        </h1>
      </div>

      {/* Type toggle */}
      <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-5">
        <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
             style={{ left: tipo === 'despesa' ? 4 : 'calc(50%)' }} />
        {([['receita', 'Receita', 'ti-arrow-down-right'], ['despesa', 'Despesa', 'ti-arrow-up-right']] as const).map(([t, label, icon]) => (
          <button key={t} onClick={() => setTipo(t)}
                  className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                  style={{ color: tipo === t ? (t === 'despesa' ? 'var(--c-danger)' : 'var(--c-success)') : 'var(--c-muted)', fontFamily: 'inherit' }}>
            <i className={`ti ${icon} text-base`} /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <Field label="Descrição">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: Mercado da semana"
            className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </Field>

        <Field label="Valor">
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="R$ 0,00"
            inputMode="decimal"
            className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </Field>

        <Field label="Data">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </Field>

        {filtered.length > 0 && (
          <Field label="Categoria">
            <div className="grid grid-cols-4 gap-1.5">
              {filtered.map((c) => {
                const active = catId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCatId(active ? '' : c.id)}
                    className="press p-2.5 rounded-md border flex flex-col items-center gap-1 text-[10px] transition-colors cursor-pointer"
                    style={{
                      background: active ? c.color + '15' : 'var(--c-card)',
                      borderColor: active ? c.color : 'var(--c-border)',
                      color: active ? c.color : 'var(--c-ink-2)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div className="w-7 h-7 rounded-[8px] grid place-items-center"
                         style={{ background: c.color + '1F', color: c.color }}>
                      <i className={`ti ${c.icon} text-sm`} />
                    </div>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer text-muted">
          <input type="checkbox" checked={recur} onChange={(e) => setRecur(e.target.checked)} />
          <span>Lançamento recorrente (todo mês)</span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="press mt-6 w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 border-none cursor-pointer"
        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}
      >
        <i className="ti ti-check" /> {saving ? 'Salvando...' : 'Salvar lançamento'}
      </button>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
