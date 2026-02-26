import React, { useState } from 'react';
import { Wallet, User, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function Auth({ onLogin }: { onLogin: (userId: string, userName: string) => void }) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        if (!authForm.name.trim()) { setError('Informe seu nome.'); setLoading(false); return; }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { name: authForm.name } }
        });
        if (signUpError) throw signUpError;
        if (data.user) onLogin(data.user.id, authForm.name);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (signInError) throw signInError;
        const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário';
        onLogin(data.user.id, userName);
      }
    } catch (err: any) {
      const msg = err?.message || 'Ocorreu um erro. Tente novamente.';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('User already registered')) setError('Este e-mail já está cadastrado.');
      else if (msg.includes('Password should be')) setError('A senha deve ter no mínimo 6 caracteres.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4 shadow-lg">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">BolsoFácil</h1>
          <p className="text-indigo-200 mt-2 text-sm">Seu controle financeiro inteligente</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                <input required type="text" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-white placeholder-indigo-300/50" placeholder="Seu nome" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1">E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
              <input required type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-white placeholder-indigo-300/50" placeholder="seu@email.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-200 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
              <input required type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-white placeholder-indigo-300/50" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-6 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} className="text-sm text-indigo-300 hover:text-white transition-colors">
            {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
}
