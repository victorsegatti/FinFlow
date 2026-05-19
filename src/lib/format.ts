import { format, parseISO, isAfter, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (d: string | Date, pattern = "dd 'de' MMM") =>
  format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: ptBR });

export const fmtMonth = (d: string | Date) =>
  format(typeof d === 'string' ? parseISO(d) : d, 'MMM yyyy', { locale: ptBR });

export const isLate = (dueDate: string) =>
  isBefore(parseISO(dueDate), new Date()) && new Date().toDateString() !== parseISO(dueDate).toDateString();

export const daysUntil = (date: string) => differenceInDays(parseISO(date), new Date());

export const parseBRLInput = (input: string): number => {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
