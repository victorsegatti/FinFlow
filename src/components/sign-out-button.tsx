'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton({
  variant = 'icon',
}: { variant?: 'icon' | 'full' }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (variant === 'full') {
    return (
      <button onClick={signOut} disabled={loading}
              className="press w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 border border-border bg-card cursor-pointer disabled:opacity-40"
              style={{ color: 'var(--c-muted)', fontFamily: 'inherit' }}>
        <i className="ti ti-logout text-sm" /> {loading ? 'Saindo…' : 'Sair'}
      </button>
    );
  }

  return (
    <button onClick={signOut} disabled={loading}
            aria-label="Sair"
            className="press w-10 h-10 rounded-full grid place-items-center bg-bg-elev border border-border text-ink cursor-pointer disabled:opacity-40">
      <i className="ti ti-logout text-base" />
    </button>
  );
}
