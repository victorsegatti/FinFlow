'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard',   icon: 'ti-home-2',        label: 'Início' },
  { href: '/lancamentos', icon: 'ti-list-details',   label: 'Lançamentos' },
  { href: '/contas',      icon: 'ti-receipt-2',      label: 'Contas' },
  { href: '/metas',       icon: 'ti-target-arrow',   label: 'Metas' },
];

export function BottomNav({ onNew }: { onNew?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-6">
      <div className="bg-bg-elev border border-border rounded-xl shadow-3 px-2.5 py-2 flex items-center justify-between backdrop-blur-xl">
        {items.slice(0, 2).map(it => <NavItem key={it.href} it={it} active={pathname.startsWith(it.href)} />)}
        <button onClick={onNew} className="press w-13 h-13 rounded-full grid place-items-center border-none cursor-pointer -mt-7 shadow-2"
                style={{ width: 52, height: 52, background: 'var(--c-brand)', color: 'var(--c-brand-fg)', boxShadow: '0 8px 20px -4px var(--c-brand)' }}
                aria-label="Novo lançamento">
          <i className="ti ti-plus text-2xl" />
        </button>
        {items.slice(2).map(it => <NavItem key={it.href} it={it} active={pathname.startsWith(it.href)} />)}
      </div>
    </div>
  );
}

function NavItem({ it, active }: { it: { href: string; icon: string; label: string }; active: boolean }) {
  return (
    <Link href={it.href} className="press flex-1 flex flex-col items-center gap-0.5 py-1.5"
          style={{ color: active ? 'var(--c-ink)' : 'var(--c-faint)' }}>
      <i className={`ti ${it.icon} text-[22px]`} />
      <span className="text-[10px] font-medium">{it.label}</span>
    </Link>
  );
}
