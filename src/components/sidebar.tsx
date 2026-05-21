'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './sign-out-button';

const items = [
  { href: '/dashboard',   icon: 'ti-home-2',      label: 'Início' },
  { href: '/lancamentos', icon: 'ti-list-details', label: 'Lançamentos' },
  { href: '/contas',      icon: 'ti-receipt-2',    label: 'Contas' },
  { href: '/metas',       icon: 'ti-target-arrow', label: 'Metas' },
];

export function Sidebar({ userName, onNew }: { userName: string; onNew?: () => void }) {
  const pathname = usePathname();
  const initials = userName.slice(0, 2).toUpperCase();
  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-bg-elev fixed h-screen z-30">
      <div className="px-5 py-6 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl grid place-items-center bg-brand text-brand-fg font-semibold text-sm"
             style={{ fontFamily: 'var(--font-display)' }}>{initials}</div>
        <div>
          <div className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>FinFlow</div>
          <div className="text-[11px] text-muted">{userName}</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(it => {
          const active = pathname.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href}
                  className="press flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: active ? 'var(--c-ink)' : 'var(--c-muted)', background: active ? 'var(--c-brand-soft)' : 'transparent' }}>
              <i className={`ti ${it.icon} text-lg`} style={{ color: active ? 'var(--c-brand)' : undefined }} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-5 space-y-2">
        <button onClick={onNew} className="press w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border-none cursor-pointer"
                style={{ background: 'var(--c-brand)', color: 'var(--c-brand-fg)', fontFamily: 'inherit' }}>
          <i className="ti ti-plus" /> Novo lançamento
        </button>
        <SignOutButton variant="full" />
      </div>
    </aside>
  );
}
