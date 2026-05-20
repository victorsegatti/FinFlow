'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types/database';
import { parseCsv, ParsedRow } from '@/lib/csv-import';
import { fmtBRL, fmtDate, cn } from '@/lib/format';

type RowDraft = ParsedRow & { include: boolean; categoryId: string | null };

export default function ImportarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cats, setCats] = useState<Category[]>([]);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [detected, setDetected] = useState<'conta' | 'cartao' | 'unknown'>('unknown');
  const [errors, setErrors] = useState<string[]>([]);
  const [bulkCat, setBulkCat] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCats((data || []) as Category[]));
  }, []);

  function parse(raw: string) {
    const res = parseCsv(raw);
    setDetected(res.detected);
    setErrors(res.errors);
    setRows(res.rows.map((r) => ({ ...r, include: true, categoryId: null })));
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || '');
      setText(txt);
      parse(txt);
    };
    reader.readAsText(file, 'utf-8');
  }

  function applyBulkCat() {
    if (!bulkCat) return;
    setRows((rs) => rs.map((r) => ({ ...r, categoryId: bulkCat })));
  }

  async function save() {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const toInsert = selected.map((r) => ({
        user_id: user.id,
        description: r.description,
        amount: r.amount,
        type: r.type,
        date: r.date,
        category_id: r.categoryId || null,
        is_recurring: false,
      }));
      const { error } = await supabase.from('transactions').insert(toInsert);
      if (error) throw error;
      setDone(selected.length);
      setRows([]);
      setText('');
      router.refresh();
    } catch (e: any) {
      alert('Erro ao salvar: ' + e?.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredCats = (type: 'receita' | 'despesa') =>
    cats.filter((c) => c.type === type || c.type === 'ambos');

  const totalIncluded = rows.filter((r) => r.include).length;
  const totalAmount = rows
    .filter((r) => r.include)
    .reduce((s, r) => s + (r.type === 'receita' ? r.amount : -r.amount), 0);

  return (
    <>
      <div className="ff-enter flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 shrink-0">
          <i className="ti ti-arrow-left text-sm" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Importar do Nubank
          </h1>
          <p className="text-[11px] text-muted mt-0.5">Cole ou suba o CSV exportado do app</p>
        </div>
      </div>

      {done !== null ? (
        <div className="bg-success-soft border rounded-md p-4 text-center" style={{ borderColor: 'var(--c-success-soft)' }}>
          <i className="ti ti-circle-check text-3xl" style={{ color: 'var(--c-success)' }} />
          <p className="text-sm font-medium mt-2 text-ink">{done} lançamentos importados</p>
          <button onClick={() => { setDone(null); router.push('/lancamentos'); }}
                  className="press mt-3 py-2 px-4 rounded-pill text-xs font-semibold"
                  style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
            Ver lançamentos
          </button>
        </div>
      ) : rows.length === 0 ? (
        <>
          <div className="bg-brand-soft rounded-md p-3.5 mb-4 text-xs leading-relaxed" style={{ color: 'var(--c-brand)' }}>
            <p className="font-medium mb-1">Como exportar:</p>
            <p style={{ color: 'var(--c-ink-2)' }}>
              <strong>Conta:</strong> app Nubank → Conta → ⚙️ → Exportar extrato (CSV).<br />
              <strong>Cartão:</strong> app Nubank → Cartão de Crédito → Faturas → Exportar (CSV).
            </p>
          </div>

          <button onClick={() => fileInputRef.current?.click()}
                  className="press w-full py-6 mb-3 rounded-md border-2 border-dashed flex flex-col items-center gap-2 cursor-pointer"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-card)' }}>
            <i className="ti ti-upload text-2xl" style={{ color: 'var(--c-brand)' }} />
            <span className="text-sm font-medium text-ink">Subir arquivo CSV</span>
            <span className="text-[11px] text-muted">ou arraste e solte aqui</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

          <div className="text-[11px] text-muted text-center my-3">ou cole o conteúdo</div>

          <textarea value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => text && parse(text)}
                    placeholder="Data,Valor,Identificador,Descrição&#10;15/01/2024,-50,00,abc123,Compra no débito"
                    rows={6}
                    className="w-full p-3 bg-card border border-border rounded-md text-xs font-mono text-ink outline-none focus:border-brand"
                    style={{ fontFamily: 'ui-monospace, monospace' }} />
          {text && (
            <button onClick={() => parse(text)}
                    className="press mt-3 w-full py-3 rounded-pill text-sm font-semibold"
                    style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
              Processar CSV
            </button>
          )}
          {errors.length > 0 && (
            <div className="mt-3 p-3 bg-danger-soft rounded-md text-xs" style={{ color: 'var(--c-danger)' }}>
              {errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-card border border-border rounded-md p-3.5 mb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted uppercase tracking-wider">
                {detected === 'conta' ? 'Extrato de conta' : detected === 'cartao' ? 'Fatura de cartão' : 'Detectado'}
              </div>
              <div className="text-sm font-medium text-ink mt-0.5">
                {totalIncluded} de {rows.length} selecionados
              </div>
            </div>
            <div className="num text-base font-semibold text-ink">
              {totalAmount >= 0 ? '+' : '−'}{fmtBRL(Math.abs(totalAmount))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-md p-3 mb-3 flex items-center gap-2">
            <span className="text-xs text-muted shrink-0">Categoria pra todas:</span>
            <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)}
                    className="flex-1 h-9 px-2 bg-bg-elev border border-border rounded-sm text-xs text-ink outline-none">
              <option value="">Selecionar…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={applyBulkCat} disabled={!bulkCat}
                    className="press shrink-0 px-3 py-2 rounded-sm text-[11px] font-semibold disabled:opacity-40"
                    style={{ background: 'var(--c-brand-soft)', color: 'var(--c-brand)' }}>
              Aplicar
            </button>
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            {rows.map((r, i) => {
              const cats4Row = filteredCats(r.type);
              return (
                <div key={i}
                     className={cn(
                       'bg-card border rounded-md p-3 flex items-start gap-2.5',
                       !r.include && 'opacity-50',
                     )}
                     style={{ borderColor: r.include ? 'var(--c-border)' : 'var(--c-border-2)' }}>
                  <button onClick={() => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, include: !row.include } : row))}
                          className="press w-5 h-5 rounded grid place-items-center shrink-0 mt-0.5 border-none cursor-pointer"
                          style={{ background: r.include ? 'var(--c-brand)' : 'transparent', border: r.include ? 'none' : '1.5px solid var(--c-border)' }}>
                    {r.include && <i className="ti ti-check text-xs" style={{ color: 'var(--c-brand-fg)' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-ink truncate">{r.description}</span>
                      <span className={cn('num text-sm font-semibold whitespace-nowrap',
                        r.type === 'receita' ? 'text-success' : 'text-ink')}>
                        {r.type === 'receita' ? '+' : '−'}{fmtBRL(r.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted">{fmtDate(r.date)}</span>
                      <select value={r.categoryId || ''}
                              onChange={(e) => setRows((rs) => rs.map((row, idx) => idx === i ? { ...row, categoryId: e.target.value || null } : row))}
                              className="flex-1 h-7 px-2 bg-bg-elev border border-border rounded-sm text-[11px] text-ink outline-none">
                        <option value="">Sem categoria</option>
                        {cats4Row.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setRows([]); setText(''); setErrors([]); }}
                    disabled={saving}
                    className="press flex-1 py-3 rounded-pill text-sm font-medium border"
                    style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', color: 'var(--c-ink-2)' }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving || totalIncluded === 0}
                    className="press flex-[2] py-3 rounded-pill text-sm font-semibold disabled:opacity-40 border-none"
                    style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)' }}>
              <i className="ti ti-check" /> {saving ? 'Importando…' : `Importar ${totalIncluded}`}
            </button>
          </div>
        </>
      )}
    </>
  );
}
