'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/currency-input';
import { buildRecurringDates } from '@/lib/recurrence';

export default function NovaContaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cats, setCats] = useState<Category[]>([]);
  const [tipo, setTipo] = useState<'pagar' | 'receber'>('pagar');
  const [desc, setDesc] = useState('');
  const [cents, setCents] = useState(0);
  const [vencimento, setVencimento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [catId, setCatId] = useState('');
  const [recur, setRecur] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      setCats((data || []) as Category[]);
    });
  }, []);

  async function handleSave() {
    if (!desc || cents === 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const dates = recur ? buildRecurringDates(vencimento) : [vencimento];
    const records = dates.map((d) => ({
      user_id: user.id,
      description: desc,
      amount: cents / 100,
      type: tipo,
      due_date: d,
      category_id: catId || null,
      is_recurring: recur,
      status: 'pending' as const,
    }));
    const { error } = await supabase.from('bills').insert(records);

    setSaving(false);
    if (error) return alert(error.message);
    router.push('/contas');
    router.refresh();
  }

  const filtered = cats.filter((c) => c.type === (tipo === 'pagar' ? 'despesa' : 'receita') || c.type === 'ambos');

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <h1 className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Nova conta
        </h1>
      </div>

      {/* Type toggle */}
      <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-5">
        <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
             style={{ left: tipo === 'pagar' ? 4 : 'calc(50%)' }} />
        {([['pagar', 'A pagar', 'ti-arrow-up-right'], ['receber', 'A receber', 'ti-arrow-down-right']] as const).map(([t, label, icon]) => (
          <button key={t} onClick={() => setTipo(t)}
                  className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                  style={{ color: tipo === t ? (t === 'pagar' ? 'var(--c-danger)' : 'var(--c-success)') : 'var(--c-muted)', fontFamily: 'inherit' }}>
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
            placeholder="Ex: Aluguel, Boleto, Freelance..."
            className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors"
            style={{ fontFamily: 'inherit' }}
          />
        </Field>

        <Field label="Valor">
          <CurrencyInput cents={cents} onChange={setCents}
                         className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand transition-colors num" />
        </Field>

        <Field label="Vencimento">
          <input
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
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
          <span>Recorrente (todo mês)</span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="press mt-6 w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 border-none cursor-pointer"
        style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}
      >
        <i className="ti ti-check" /> {saving ? 'Salvando...' : 'Salvar conta'}
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
