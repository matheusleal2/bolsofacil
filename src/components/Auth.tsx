import React, { useState } from 'react';
import { Wallet, User, Lock, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function Auth({ onLogin }: { onLogin: (userId: string, userName: string) => void }) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!authForm.email.trim()) { setError('Informe seu e-mail.'); return; }
    setLoading(true);
    try {
      // Pré-verificação: tenta login com senha inválida para detectar se o e-mail existe.
      // Supabase retorna "Invalid login credentials" para senha errada (usuário existe)
      // e pode retornar erro diferente ou mesma mensagem quando usuário não existe.
      // Usamos signInWithPassword como sonda — se o status HTTP for 400 com código
      // específico, sabemos que o e-mail não está registrado.
      const { error: probeError } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: '__BOLSOFACIL_PROBE_PASSWORD_THAT_WILL_NEVER_MATCH__',
      });

      if (probeError) {
        const msg = probeError.message?.toLowerCase() ?? '';
        // Quando o e-mail NÃO existe, Supabase (com proteção de enumeração desabilitada)
        // retorna mensagens como "Email not found", "user not found", etc.
        // Quando o e-mail EXISTE mas a senha está errada, retorna "invalid login credentials".
        const emailNotFound =
          msg.includes('email not found') ||
          msg.includes('user not found') ||
          msg.includes('no user') ||
          msg.includes('not registered') ||
          // Supabase GoTrue v2 com enumerate_users=false retorna status diferente
          probeError.status === 404;

        if (emailNotFound) {
          setError('Nenhuma conta encontrada com este e-mail.');
          setLoading(false);
          return;
        }
        // Se o erro for "Invalid login credentials", o e-mail existe — pode continuar.
        // Qualquer outro erro inesperado também deixa prosseguir (fail-safe).
      }

      // E-mail existe (ou não conseguimos detectar): envia o link de redefinição.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(authForm.email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setSuccessMsg('Link de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'register' | 'forgot') => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
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
          <p className="text-indigo-200 mt-2 text-sm">
            {authMode === 'forgot' ? 'Redefinição de senha' : 'Seu controle financeiro inteligente'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl mb-4">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Tela: Esqueceu a Senha */}
        {authMode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-indigo-200 text-center -mt-2 mb-2">
              Informe seu e-mail e enviaremos um link para você redefinir sua senha.
            </p>
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                <input
                  required
                  type="email"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-white placeholder-indigo-300/50"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Enviar link de redefinição'}
            </button>
          </form>
        ) : (
          /* Telas: Login / Cadastro */
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
              {authMode === 'login' && (
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-indigo-300 hover:text-white transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-6 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          {authMode === 'forgot' ? (
            <button onClick={() => switchMode('login')} className="text-sm text-indigo-300 hover:text-white transition-colors">
              ← Voltar ao login
            </button>
          ) : (
            <button onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')} className="text-sm text-indigo-300 hover:text-white transition-colors">
              {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
