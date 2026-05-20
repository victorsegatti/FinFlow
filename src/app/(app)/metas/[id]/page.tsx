'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category, Goal } from '@/types/database';
import { parseBRLInput } from '@/lib/format';
import { ConfirmDialog } from '@/components/confirm-dialog';

export default function EditarMetaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [tipo, setTipo] = useState<'budget' | 'savings'>('budget');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [current, setCurrent] = useState('');
  const [catId, setCatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: g }, { data: catData }] = await Promise.all([
        supabase.from('goals').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('categories').select('*'),
      ]);
      if (g) {
        const goal = g as Goal;
        setTipo(goal.type as 'budget' | 'savings');
        setNome(goal.name);
        setValor(String(Number(goal.target_amount).toFixed(2)).replace('.', ','));
        setCurrent(String(Number(goal.current_amount || 0).toFixed(2)).replace('.', ','));
        setCatId(goal.category_id || '');
      }
      setCats((catData || []) as Category[]);
      setLoading(false);
    })();
  }, [params.id]);

  async function handleSave() {
    if (!nome || !valor) return;
    setSaving(true);
    const payload: any = {
      name: nome,
      target_amount: parseBRLInput(valor),
      type: tipo,
      category_id: catId || null,
    };
    if (tipo === 'savings') payload.current_amount = parseBRLInput(current || '0');
    const { error } = await supabase.from('goals').update(payload).eq('id', params.id);
    setSaving(false);
    if (error) return alert(error.message);
    router.push('/metas');
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('goals').delete().eq('id', params.id);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) return alert(error.message);
    router.push('/metas');
    router.refresh();
  }

  const filtered = cats.filter((c) => c.type === 'despesa' || c.type === 'ambos');

  if (loading) return <div className="text-center py-12 text-muted text-sm">Carregando…</div>;

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          Editar meta
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
        title="Excluir meta?"
        message="Essa ação não pode ser desfeita. A meta será removida permanentemente."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="space-y-3">
        <Field label="Nome da meta">
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                 className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                 style={{ fontFamily: 'inherit' }} />
        </Field>

        <Field label={tipo === 'budget' ? 'Limite mensal' : 'Valor alvo'}>
          <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal"
                 className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                 style={{ fontFamily: 'inherit' }} />
        </Field>

        {tipo === 'savings' && (
          <Field label="Valor acumulado">
            <input type="text" value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal"
                   className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                   style={{ fontFamily: 'inherit' }} />
          </Field>
        )}

        {tipo === 'budget' && filtered.length > 0 && (
          <Field label="Categoria">
            <div className="grid grid-cols-4 gap-1.5">
              {filtered.map((c) => {
                const active = catId === c.id;
                return (
                  <button key={c.id} onClick={() => setCatId(catId === c.id ? '' : c.id)}
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
