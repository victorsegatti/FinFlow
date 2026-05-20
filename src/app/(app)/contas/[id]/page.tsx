'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category, Bill } from '@/types/database';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CurrencyInput } from '@/components/currency-input';
import { buildFutureRecurringDates } from '@/lib/recurrence';

export default function EditarContaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [tipo, setTipo] = useState<'pagar' | 'receber'>('pagar');
  const [desc, setDesc] = useState('');
  const [cents, setCents] = useState(0);
  const [vencimento, setVencimento] = useState('');
  const [catId, setCatId] = useState('');
  const [recur, setRecur] = useState(false);
  const [status, setStatus] = useState<'pending' | 'late' | 'paid'>('pending');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replicating, setReplicating] = useState(false);
  const [replicatedMsg, setReplicatedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: catData }] = await Promise.all([
        supabase.from('bills').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('categories').select('*'),
      ]);
      if (b) {
        const bill = b as Bill;
        setTipo(bill.type as 'pagar' | 'receber');
        setDesc(bill.description);
        setCents(Math.round(Number(bill.amount) * 100));
        setVencimento(bill.due_date);
        setCatId(bill.category_id || '');
        setRecur(!!bill.is_recurring);
        setStatus(bill.status as 'pending' | 'late' | 'paid');
      }
      setCats((catData || []) as Category[]);
      setLoading(false);
    })();
  }, [params.id]);

  async function handleSave() {
    if (status === 'paid') return; // bloqueado
    if (!desc || cents === 0) return;
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const newStatus = vencimento < today ? 'late' : 'pending';

    const { error } = await supabase.from('bills').update({
      description: desc,
      amount: cents / 100,
      type: tipo,
      due_date: vencimento,
      category_id: catId || null,
      is_recurring: recur,
      status: newStatus,
    }).eq('id', params.id);
    setSaving(false);
    if (error) return alert(error.message);
    router.push('/contas');
    router.refresh();
  }

  async function handleReplicate() {
    setReplicating(true);
    setReplicatedMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReplicating(false); return; }

    const futureDates = buildFutureRecurringDates(vencimento, 11);

    // Buscar contas que já existem nos meses futuros (mesmo tipo + due_date).
    // Match menos estrito (sem description/amount) porque valor/descrição podem ter mudado.
    const { data: existing } = await supabase
      .from('bills')
      .select('due_date, description')
      .eq('user_id', user.id)
      .eq('type', tipo)
      .in('due_date', futureDates);

    // Considera duplicata se o description bate (case insensitive) OU se já existe alguma conta do mesmo tipo nesse dia.
    // Usa "começa com" pra ser tolerante a pequenas variações tipo "Salário" vs "Salário Empresa X".
    const descLower = desc.toLowerCase().trim();
    const existingDates = new Set(
      (existing || [])
        .filter((b: any) => {
          const bd = (b.description || '').toLowerCase().trim();
          return bd === descLower || bd.includes(descLower) || descLower.includes(bd);
        })
        .map((b: any) => b.due_date),
    );
    const datesToCreate = futureDates.filter((d) => !existingDates.has(d));

    if (datesToCreate.length === 0) {
      setReplicatedMsg('Já existem cópias em todos os próximos meses.');
      setReplicating(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const rows = datesToCreate.map((d) => ({
      user_id: user.id,
      description: desc,
      amount: cents / 100,
      type: tipo,
      due_date: d,
      category_id: catId || null,
      is_recurring: true,
      status: (d < today ? 'late' : 'pending') as 'pending' | 'late',
    }));

    const { error } = await supabase.from('bills').insert(rows);
    setReplicating(false);
    if (error) {
      setReplicatedMsg(`Erro: ${error.message}`);
      return;
    }
    setReplicatedMsg(`${rows.length} cópia${rows.length === 1 ? '' : 's'} criada${rows.length === 1 ? '' : 's'} pelos próximos meses.`);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('bills').delete().eq('id', params.id);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) return alert(error.message);
    router.push('/contas');
    router.refresh();
  }

  const filtered = cats.filter((c) => c.type === (tipo === 'pagar' ? 'despesa' : 'receita') || c.type === 'ambos');

  if (loading) return <div className="text-center py-12 text-muted text-sm">Carregando…</div>;

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          Editar conta
        </h1>
        <button onClick={() => setConfirmOpen(true)} disabled={deleting}
                className="press w-9 h-9 rounded-full grid place-items-center border-none cursor-pointer disabled:opacity-40"
                style={{ background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }}
                aria-label="Excluir">
          <i className="ti ti-trash text-sm" />
        </button>
      </div>

      {status === 'paid' && (
        <div className="mb-4 p-3 rounded-md text-xs flex items-start gap-2"
             style={{ background: 'var(--c-success-soft)', color: 'var(--c-success)' }}>
          <i className="ti ti-lock text-base shrink-0 mt-0.5" />
          <span>Conta paga não pode ser editada. Pra alterar, desfaça o pagamento (botão ↺ na lista) e volte aqui.</span>
        </div>
      )}

      <fieldset disabled={status === 'paid'} style={{ border: 'none', padding: 0, margin: 0, opacity: status === 'paid' ? 0.6 : 1 }}>
        <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-5">
          <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
               style={{ left: tipo === 'pagar' ? 4 : 'calc(50%)' }} />
          {([['pagar', 'A pagar', 'ti-arrow-up-right'], ['receber', 'A receber', 'ti-arrow-down-right']] as const).map(([t, label, icon]) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
                    className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-semibold"
                    style={{ color: tipo === t ? (t === 'pagar' ? 'var(--c-danger)' : 'var(--c-success)') : 'var(--c-muted)' }}>
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
          <Field label="Vencimento">
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)}
                   className="w-full h-11 px-3 bg-card border border-border rounded-md text-sm text-ink outline-none focus:border-brand"
                   style={{ fontFamily: 'inherit' }} />
          </Field>
          {filtered.length > 0 && (
            <Field label="Categoria">
              <div className="grid grid-cols-4 gap-1.5">
                {filtered.map((c) => {
                  const active = catId === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => setCatId(active ? '' : c.id)}
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
            <span>Recorrente (todo mês)</span>
          </label>

          {recur && status !== 'paid' && (
            <div className="mt-2 p-3 rounded-md border" style={{ background: 'var(--c-brand-soft)', borderColor: 'var(--c-brand-soft)' }}>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--c-brand)' }}>
                Crie cópias dessa conta nos próximos 11 meses (mesmo dia do mês).
              </p>
              <button type="button" onClick={handleReplicate} disabled={replicating}
                      className="press w-full py-2 rounded-pill text-xs font-semibold border-none cursor-pointer disabled:opacity-40"
                      style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
                <i className="ti ti-copy" /> {replicating ? 'Replicando…' : 'Replicar pelos próximos 11 meses'}
              </button>
              {replicatedMsg && (
                <p className="text-[11px] mt-2" style={{ color: 'var(--c-ink-2)' }}>{replicatedMsg}</p>
              )}
            </div>
          )}
        </div>

        {status !== 'paid' && (
          <button onClick={handleSave} disabled={saving} type="button"
                  className="press mt-6 w-full py-3.5 rounded-pill text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 border-none cursor-pointer"
                  style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
            <i className="ti ti-check" /> {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        )}
      </fieldset>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir conta?"
        message="Essa ação não pode ser desfeita. A conta será removida permanentemente."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
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
