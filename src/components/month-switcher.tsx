'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Props = { month: Date | string };

function toDate(m: Date | string): Date {
  if (m instanceof Date) return m;
  // accept 'yyyy-MM' or 'yyyy-MM-dd' or full ISO
  if (/^\d{4}-\d{2}$/.test(m)) {
    const [y, mm] = m.split('-').map(Number);
    return new Date(y, mm - 1, 1);
  }
  return parseISO(m);
}

export function MonthSwitcher({ month }: Props) {
  const pathname = usePathname() || '/dashboard';
  const m = toDate(month);
  const prev = subMonths(m, 1);
  const next = addMonths(m, 1);
  const label = format(m, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="ff-enter flex items-center justify-center gap-2 mb-3">
      <Link href={`${pathname}?month=${format(prev, 'yyyy-MM')}`}
            aria-label="Mês anterior"
            className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 no-underline">
        <i className="ti ti-chevron-left text-sm" />
      </Link>
      <Link href={pathname}
            className="flex-1 text-center text-sm font-medium text-ink capitalize no-underline"
            style={{ color: 'var(--c-ink)' }}>
        {label}
      </Link>
      <Link href={`${pathname}?month=${format(next, 'yyyy-MM')}`}
            aria-label="Próximo mês"
            className="press w-9 h-9 rounded-full grid place-items-center bg-card border border-border text-ink-2 no-underline">
        <i className="ti ti-chevron-right text-sm" />
      </Link>
    </div>
  );
}

export function parseMonthParam(month?: string | null): { viewMonth: Date; isCurrent: boolean } {
  const now = new Date();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const viewMonth = new Date(y, m - 1, 1);
    return { viewMonth, isCurrent: format(viewMonth, 'yyyy-MM') === format(now, 'yyyy-MM') };
  }
  return { viewMonth: now, isCurrent: true };
}
