import { addMonths, format, parseISO } from 'date-fns';

export const RECURRENCE_MONTHS = 12;

export function buildRecurringDates(baseDate: string, count = RECURRENCE_MONTHS): string[] {
  const base = parseISO(baseDate);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(format(addMonths(base, i), 'yyyy-MM-dd'));
  }
  return dates;
}

export function buildFutureRecurringDates(fromDate: string, count = RECURRENCE_MONTHS - 1): string[] {
  // Para edição: data atual + (count) próximos meses
  const base = parseISO(fromDate);
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    dates.push(format(addMonths(base, i), 'yyyy-MM-dd'));
  }
  return dates;
}
