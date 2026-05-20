'use client';
import { forwardRef } from 'react';

function format(cents: number): string {
  const reais = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${reais}`;
}

export const CurrencyInput = forwardRef<HTMLInputElement, {
  cents: number;
  onChange: (cents: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}>(({ cents, onChange, disabled, placeholder, className }, ref) => {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={cents > 0 ? format(cents) : ''}
      placeholder={placeholder ?? 'R$ 0,00'}
      disabled={disabled}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        const n = parseInt(digits || '0', 10);
        if (!isNaN(n)) onChange(Math.min(n, 99_999_999_99));
      }}
      className={className}
      style={{ fontFamily: 'inherit' }}
    />
  );
});
CurrencyInput.displayName = 'CurrencyInput';
