'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category, Transaction } from '@/types/database';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CurrencyInput } from '@/components/currency-input';

export default function EditarLancamentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [desc, setDesc] = useState('');
  const [cents, setCents] = useState(0);
  const [data, setData] = useState('');
  const [catId, setCatId] = useState<string>('');
  const [recur, setRecur] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: tx }, { data: catData }] = await Promise.all([
        supabase.from('transactions').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('categories').select('*'),
      ]);
      if (tx) {
        const t = tx as Transaction;
        setTipo(t.type as 'receita' | 'despesa');
        setDesc(t.description);
        setCents(Math.round(Number(t.amount) * 100));
        setData(t.date);
        setCatId(t.category_id || '');
        setRecur(!!t.is_recurring);
      }
      setCats((catData || []) as Category[]);
      setLoading(false);
    })();
  }, [params.id]);

  async function handleSave() {
    if (!desc || cents === 0) return;
    setSaving(true);
    const { error } = await supabase.from('transactions').update({
      description: desc,
      amount: cents / 100,
      type: tipo,
      date: data,
      category_id: catId || null,
      is_recurring: recur,
    }).eq('id', params.id);
    setSaving(false);
    if (error) return alert(error.message);
    router.push('/lancamentos');
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('transactions').delete().eq('id', params.id);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) return alert(error.message);
    router.push('/lancamentos');
    router.refresh();
  }

  const filtered = cats.filter((c) => c.type === tipo || c.type === 'ambos');

  if (loading) return <div className="text-center py-12 text-muted text-sm">Carregando…</div>;

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          Editar lançamento
        </h1>
        <button onClick={() => setConfirmOpen(true)} disabled={deleting}
                className="press w-9 h-9 rounded-full grid place-items-center border-none cursor-pointer disabled:opacity-40"
                style={{ background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }}
                aria-label="Excluir">
          <i className="ti ti-trash text-sm" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir lançamento?"
        message="Essa ação não pode ser desfeita. O lançamento será removido permanentemente."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-5">
        <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
             style={{ left: tipo === 'despesa' ? 'calc(50%)' : 4 }} />
        {([['receita', 'Receita', 'ti-arrow-down-right'], ['despesa', 'Despesa', 'ti-arrow-up-right']] as const).map(([t, label, icon]) => (
          <button key={t} onClick={() => setTipo(t)}
                  className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-semibold"
                  style={{ color: tipo === t ? (t === 'despesa' ? 'var(--c-danger)' : 'var(--c-success)') : 'var(--c-muted)' }}>
            <i className={`ti ${icon} text-base`} /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <Field label="Descrição">
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
                 className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                 style={{ fontFamily: 'inherit' }} />
        </Field>
        <Field label="Valor">
          <CurrencyInput cents={cents} onChange={setCents}
                         className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand num" />
        </Field>
        <Field label="Data">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                 className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                 style={{ fontFamily: 'inherit' }} />
        </Field>
        {filtered.length > 0 && (
          <Field label="Categoria">
            <div className="grid grid-cols-4 gap-1.5">
              {filtered.map((c) => {
                const active = catId === c.id;
                return (
                  <button key={c.id} onClick={() => setCatId(active ? '' : c.id)}
                          className="press p-2.5 rounded-md border flex flex-col items-center gap-1 text-[10px] cursor-pointer"
                          style={{
                            background: active ? c.color + '15' : 'var(--c-card)',
                            borderColor: active ? c.color : 'var(--c-border)',
                            color: active ? c.color : 'var(--c-ink-2)',
                          }}>
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
          <span>Lançamento recorrente</span>
        </label>
      </div>

      <button onClick={handleSave} disabled={saving}
              className="press mt-6 w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 border-none cursor-pointer"
              style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
        <i className="ti ti-check" /> {saving ? 'Salvando…' : 'Salvar alterações'}
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
