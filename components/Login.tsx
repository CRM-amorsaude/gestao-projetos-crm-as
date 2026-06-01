
import React, { useState } from 'react';
import { supabase } from '../supabase';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Logo AmorSaúde via URL fornecida
  const logoUrl = "https://5338832.fs1.hubspotusercontent-na1.net/hubfs/5338832/LOGO%20AS%20COLORIDO.png";

  const validateDomain = (email: string) => {
    return email.toLowerCase().endsWith('@amorsaude.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!validateDomain(email)) {
      setError('Apenas e-mails @amorsaude.com são permitidos.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              name,
              email,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            }]);
          
          if (profileError) throw profileError;
          alert('Conta criada! Por favor, verifique seu e-mail.');
          setIsSignUp(false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (data.user) onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
          <div className="px-8 pt-10 pb-4 flex flex-col items-center">
            <div className="mb-6">
              <img 
                src={logoUrl} 
                alt="AmorSaúde Logo" 
                className="h-14 w-auto object-contain"
              />
            </div>
            <h2 className="text-slate-900 dark:text-white text-xl font-black text-center mb-1">CRM Interno</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center px-4">
              Entre na sua conta para gerenciar projetos.
            </p>
          </div>

          <form className="px-8 pb-10 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-lg animate-shake">
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                  <input 
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-300" 
                    placeholder="Seu nome" 
                    required 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase">E-mail Corporativo</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                <input 
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-300" 
                  placeholder="nome@amorsaude.com" 
                  required 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase">Senha</label>
                {!isSignUp && <a className="text-primary text-[10px] font-black uppercase hover:underline" href="#">Esqueceu?</a>}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                <input 
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-300" 
                  placeholder="••••••••" 
                  required 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black uppercase tracking-widest py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-2" 
              type="submit"
            >
              {loading ? 'Entrando...' : (isSignUp ? 'Cadastrar-se' : 'Acessar Sistema')}
              {!loading && <span className="material-symbols-outlined text-[18px]">{isSignUp ? 'person_add' : 'login'}</span>}
            </button>

            <div className="pt-4 text-center">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <footer className="py-8 px-4">
        <p className="text-slate-400 dark:text-slate-500 text-[10px] text-center font-bold uppercase tracking-widest">
          © 2024 AmorSaúde. Sistema exclusivo para e-mails @amorsaude.com
        </p>
      </footer>
    </div>
  );
};

export default Login;
