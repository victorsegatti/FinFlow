'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';

export function NewTxSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [cents, setCents] = useState(0);
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCats((data || []) as Category[]));
  }, []);

  const press = (k: string) => {
    if (k === 'back') { setCents(c => Math.floor(c / 10)); return; }
    const d = parseInt(k, 10);
    if (isNaN(d)) return;
    setCents(c => Math.min(c * 10 + d, 99999999));
  };

  const reais = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const filtered = cats.filter(c => c.type === type || c.type === 'ambos');

  async function save() {
    if (cents === 0 || !desc) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from('transactions').insert({
      user_id: user.id, description: desc, amount: cents / 100,
      type, date: new Date().toISOString().split('T')[0],
      category_id: catId || null, is_recurring: false,
    });
    setSaving(false);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="ff-backdrop absolute inset-0 cursor-pointer" onClick={onClose}
           style={{ background: 'rgba(10,15,12,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="ff-sheet relative bg-bg-elev rounded-t-[28px] p-4 pb-8 max-h-[90vh] overflow-y-auto"
           style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }}>
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Novo lançamento
          </h2>
          <button onClick={onClose} className="press w-8 h-8 rounded-full grid place-items-center bg-border-2 text-ink-2 border-none cursor-pointer">
            <i className="ti ti-x text-sm" />
          </button>
        </div>

        {/* type toggle */}
        <div className="relative grid grid-cols-2 bg-border-2 rounded-pill p-1 mb-5">
          <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-bg-elev shadow-1 transition-all duration-300"
               style={{ left: type === 'despesa' ? 4 : 'calc(50%)' }} />
          {([['despesa','Despesa','ti-arrow-down-right'],['receita','Receita','ti-arrow-up-right']] as const).map(([t, label, icon]) => (
            <button key={t} onClick={() => setType(t)}
                    className="relative z-10 h-9 border-none bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                    style={{ color: type === t ? (t === 'despesa' ? 'var(--c-danger)' : 'var(--c-success)') : 'var(--c-muted)', fontFamily: 'inherit' }}>
              <i className={`ti ${icon} text-base`} /> {label}
            </button>
          ))}
        </div>

        {/* amount */}
        <div className="text-center mb-4">
          <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Valor</div>
          <div className="num text-[44px] font-semibold leading-none"
               style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.04em',
                        color: cents > 0 ? (type === 'despesa' ? 'var(--c-ink)' : 'var(--c-success)') : 'var(--c-faint)' }}>
            {type === 'despesa' && cents > 0 ? '−' : ''}R$ {reais}
          </div>
        </div>

        {/* description */}
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
               className="w-full h-12 px-3.5 bg-card border border-border rounded-md text-sm text-ink mb-3 outline-none"
               style={{ fontFamily: 'inherit' }} />

        {/* categories */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {filtered.map(c => {
              const active = catId === c.id;
              return (
                <button key={c.id} onClick={() => setCatId(active ? '' : c.id)}
                        className="press p-2.5 rounded-md border flex flex-col items-center gap-1 cursor-pointer"
                        style={{ background: active ? c.color + '15' : 'var(--c-card)', borderColor: active ? c.color : 'var(--c-border)', fontFamily: 'inherit' }}>
                  <div className="w-8 h-8 rounded-[9px] grid place-items-center"
                       style={{ background: c.color + '1F', color: c.color }}>
                    <i className={`ti ${c.icon} text-base`} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: active ? c.color : 'var(--c-ink-2)' }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* keypad */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {['1','2','3','4','5','6','7','8','9','.','0','back'].map(k => (
            <button key={k} onClick={() => press(k)}
                    className="press h-11 rounded-md bg-card border border-border grid place-items-center cursor-pointer"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500,
                             color: k === 'back' ? 'var(--c-muted)' : 'var(--c-ink)' }}>
              {k === 'back' ? <i className="ti ti-arrow-back-up" /> : k}
            </button>
          ))}
        </div>

        <button onClick={save} disabled={cents === 0 || saving}
                className="press w-full h-12 rounded-pill border-none cursor-pointer font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}>
          <i className="ti ti-check" /> {saving ? 'Salvando...' : 'Salvar lançamento'}
        </button>
      </div>
    </div>
  );
}
