import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/FirebaseProvider';
import { LogIn, AlertCircle, Mail, Lock, User as UserIcon, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>((searchParams.get('mode') as any) || 'login');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup' || modeParam === 'login') {
      setMode(modeParam);
    }
  }, [searchParams]);

  // Redirecionar se já estiver logado (e não estiver mostrando mensagem de sucesso)
  useEffect(() => {
    if (user && !successMessage && !errorModal) {
      navigate('/', { replace: true });
    }
  }, [user, successMessage, errorModal, navigate]);

  // Redirecionar após o tempo do modal de sucesso (apenas se não for recuperação de senha)
  useEffect(() => {
    if (successMessage && mode !== 'forgot') {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        navigate('/', { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate, mode]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorModal(null);
      
      // We are in a browser environment, popup is preferred for better UX in desktop
      // but in this iframe context, sometimes redirects are safer. 
      // However, let's try popup first and fallback to redirect if it fails.
      try {
        await signInWithGoogle(false); // Try popup
        setSuccessMessage('Login com Google realizado com sucesso!');
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // If popup failed/closed, try redirect
          await signInWithGoogle(true);
          // Redirect will leave the page, so no success message here
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setErrorModal(getErrorMessage(err));
      console.error("Erro Google Auth:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorModal(null);
      if (mode === 'login') {
        await signInWithEmail(email, password);
        setSuccessMessage('Acesso autorizado! Carregando seu painel...');
      } else if (mode === 'signup') {
        if (!email || !password) {
          setErrorModal('Por favor, preencha todos os campos obrigatórios.');
          return;
        }
        await signUpWithEmail(email, password, name);
        setSuccessMessage('Sua conta foi criada com sucesso! Seja bem-vindo.');
      } else if (mode === 'forgot') {
        if (!email) {
          setErrorModal('Por favor, insira seu e-mail para receber o link de recuperação.');
          return;
        }
        await resetPassword(email);
        setSuccessMessage('Link enviado! Verifique seu e-mail (inclusive o spam) para redefinir sua senha.');
        setTimeout(() => {
          setSuccessMessage(null);
          setMode('login');
        }, 5000);
      }
    } catch (err: any) {
      setErrorModal(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (err: any) => {
    console.log("Firebase Auth Error:", err.code, err.message);
    const code = err.code || (err.message?.includes('auth/') ? err.message.match(/auth\/[a-z-]+/)?.[0] : null);
    
    switch (code) {
      case 'auth/user-disabled': return 'Esta conta foi desativada. Entre em contato com o suporte.';
      case 'auth/operation-not-allowed': return 'Este método de login não está configurado. Fale com o administrador.';
      case 'auth/unauthorized-domain': return 'Domínio não autorizado para login. Use o domínio oficial do app.';
      case 'auth/user-not-found': return 'Não encontramos uma conta com este e-mail. Deseja criar uma?';
      case 'auth/wrong-password': return 'Senha incorreta. Se esqueceu sua senha, use a opção de recuperação.';
      case 'auth/invalid-credential': return 'E-mail ou senha inválidos. Por favor, tente novamente.';
      case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar a senha.';
      case 'auth/weak-password': return 'Sua senha é muito fraca. Ela deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email': return 'O formato do e-mail é inválido. Ex: usuario@exemplo.com';
      case 'auth/network-request-failed': return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case 'auth/too-many-requests': return 'Muitas tentativas falhas. Sua conta foi bloqueada temporariamente para sua segurança. Tente novamente mais tarde.';
      case 'auth/popup-closed-by-user': return 'A janela de autenticação foi fechada antes de terminar o processo.';
      case 'auth/internal-error': return 'Ocorreu um erro interno. Por favor, tente novamente em alguns instantes.';
      default: return `Não foi possível completar a ação: ${code || 'Tente novamente.'}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background overflow-hidden relative py-10">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-secondary-container/5 rounded-full blur-[100px]"></div>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-md p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-on-surface uppercase tracking-tight">Sucesso</h3>
                <p className="text-sm text-outline leading-tight">
                  {successMessage}
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => setSuccessMessage(null)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {errorModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-md p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5"
            >
              <div className="w-20 h-20 bg-error/10 rounded-full mx-auto flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-error" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-error uppercase tracking-tight">Erro no Acesso</h3>
                <p className="text-sm text-outline leading-tight">
                  {errorModal}
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => setErrorModal(null)}
                  className="w-full py-3 bg-error text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-error/10 active:scale-95 transition-all"
                >
                  Tentar Novamente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center relative z-10"
      >
        <div className="space-y-2 mb-8 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-2"
          >
            <Logo size="lg" />
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              {mode === 'login' ? 'Bem-vindo de volta!' : mode === 'signup' ? 'Crie sua conta' : 'Recuperar senha'}
            </h1>
            <p className="text-sm text-on-surface-variant max-w-[280px] mx-auto">
              {mode === 'login' 
                ? 'Economize tempo e reduza desperdícios hoje.' 
                : mode === 'signup'
                ? 'Junte-se ao FreshKeep e otimize seu consumo.'
                : 'Enviaremos um link para você definir uma nova senha.'}
            </p>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 text-left bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/20 mb-8">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-bold text-outline uppercase ml-1 tracking-widest">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome (opcional)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-outline uppercase ml-1 tracking-widest">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none text-sm"
              />
            </div>
          </div>

          <AnimatePresence>
            {mode !== 'forgot' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Senha</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')}
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 hover:brightness-110"
            >
              {loading ? 'Processando...' : (mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Continuar' : 'Enviar E-mail')}
            </button>
          </div>
          
          <div className="text-center">
            <button 
              type="button"
              onClick={() => {
                setErrorModal(null);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="text-sm text-primary font-bold hover:opacity-80 transition-opacity"
            >
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : mode === 'signup' ? 'Já é usuário? Faça login' : 'Voltar para o Login'}
            </button>
          </div>
        </form>

        <div className="relative mb-8 flex items-center gap-3">
          <div className="flex-1 border-t border-outline-variant/30"></div>
          <span className="text-[10px] uppercase tracking-widest text-outline bg-background px-2 font-bold">Ou conecte com</span>
          <div className="flex-1 border-t border-outline-variant/30"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant/40 py-3 rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-low transition-all active:scale-[0.98] font-bold disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span className="text-on-surface text-base">Entrar com Google</span>
        </button>

        <p className="text-[8px] text-outline uppercase tracking-[0.2em] pt-8 opacity-40 font-bold">Safe & Secured by FreshKeep</p>
      </motion.div>
    </div>
  );
};
