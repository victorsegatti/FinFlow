import { fmtBRL } from '@/lib/format';

export function PrevistoRealizado({
  despPrev, despReal, recPrev, recReal,
}: {
  despPrev: number; despReal: number; recPrev: number; recReal: number;
}) {
  if (despPrev === 0 && recPrev === 0) return null;

  return (
    <div className="ff-enter mt-4 bg-card border border-border rounded-md p-4">
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted mb-3">
        Previsto vs realizado
      </div>
      <div className="flex flex-col gap-4">
        {despPrev > 0 && (
          <Row label="Despesas" prev={despPrev} real={despReal} tone="danger" />
        )}
        {recPrev > 0 && (
          <Row label="Receitas" prev={recPrev} real={recReal} tone="success" />
        )}
      </div>
    </div>
  );
}

function Row({ label, prev, real, tone }: {
  label: string; prev: number; real: number; tone: 'danger' | 'success';
}) {
  const pct = prev > 0 ? Math.min(100, Math.round((real / prev) * 100)) : 0;
  const diff = real - prev;
  // For despesas, going OVER prev is bad. For receitas, going OVER prev is good.
  const over = real > prev;
  const isBad = tone === 'danger' ? over : !over;
  const barColor = tone === 'danger' ? 'var(--c-danger)' : 'var(--c-success)';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-[11px] text-muted">{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-border-2)' }}>
        <div className="ff-fill h-full rounded-full"
             style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
      </div>
      <div className="flex items-baseline justify-between mt-1.5 text-[11px]">
        <span className="text-muted num">
          {fmtBRL(real)} <span style={{ opacity: 0.6 }}>de {fmtBRL(prev)}</span>
        </span>
        <span className={`num font-medium ${isBad ? 'text-danger' : 'text-success'}`}>
          {diff >= 0 ? '+' : '−'}{fmtBRL(Math.abs(diff))}
        </span>
      </div>
    </div>
  );
}
