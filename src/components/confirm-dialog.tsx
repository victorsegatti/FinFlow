'use client';

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  destructive = false, loading = false, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="ff-backdrop absolute inset-0 cursor-pointer"
           onClick={() => !loading && onCancel()}
           style={{ background: 'rgba(10,15,12,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="ff-enter relative w-full max-w-sm rounded-lg p-5"
           style={{ background: 'var(--c-bg-elev)', boxShadow: 'var(--shadow-3)' }}>
        <div className="w-12 h-12 rounded-[12px] grid place-items-center mb-3"
             style={{
               background: destructive ? 'var(--c-danger-soft)' : 'var(--c-brand-soft)',
               color: destructive ? 'var(--c-danger)' : 'var(--c-brand)',
             }}>
          <i className={`ti ${destructive ? 'ti-alert-triangle' : 'ti-info-circle'} text-xl`} />
        </div>
        <h2 className="text-base font-semibold text-ink mb-1.5"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
                  className="press flex-1 h-11 rounded-pill text-sm font-medium border cursor-pointer disabled:opacity-40"
                  style={{ background: 'var(--c-card)', borderColor: 'var(--c-border)', color: 'var(--c-ink-2)', fontFamily: 'inherit' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
                  className="press flex-1 h-11 rounded-pill text-sm font-semibold border-none cursor-pointer disabled:opacity-40"
                  style={{
                    background: destructive ? 'var(--c-danger)' : 'var(--c-brand)',
                    color: destructive ? '#fff' : 'var(--c-brand-fg)',
                    fontFamily: 'inherit',
                  }}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
