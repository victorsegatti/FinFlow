'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(160deg, #1A0533 0%, #0D0919 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #820AD1, #5A0A9C)' }}
          >
            <i className="ti ti-wallet text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinFlow</h1>
          <p className="text-sm text-violet-300/70 mt-1">Suas finanças no controle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 bg-card border border-border rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 bg-card border border-border rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            required
            minLength={6}
          />
          {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #820AD1, #5A0A9C)' }}
          >
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-xs text-violet-400/70 mt-5 hover:text-violet-300 transition-colors"
        >
          {mode === 'login' ? 'Não tem conta? Criar uma' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
}
