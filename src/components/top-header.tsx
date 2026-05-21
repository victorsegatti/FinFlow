'use client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SignOutButton } from './sign-out-button';

export function TopHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const sub = subtitle ?? format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const initials = title.replace('Olá, ', '').slice(0, 2).toUpperCase();

  return (
    <div className="ff-enter flex items-center justify-between px-1 pb-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          {title}
        </h1>
        <div className="text-xs text-muted mt-0.5 capitalize">{sub}</div>
      </div>
      <div className="flex gap-2">
        <SignOutButton />
        <div className="w-10 h-10 rounded-full grid place-items-center
                        bg-brand text-brand-fg text-sm font-semibold border-2 border-bg-elev"
             style={{ fontFamily: 'var(--font-display)' }}>
          {initials}
        </div>
      </div>
    </div>
  );
}
