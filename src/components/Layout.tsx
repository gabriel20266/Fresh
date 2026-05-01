import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, PlusSquare, Settings, ChevronLeft, User as UserIcon, Calendar, LayoutGrid, ShieldCheck } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { user, settings } = useAuth();
  const location = useLocation();
  
  // Define if we should show back button based on path
  const isSubPage = location.pathname.startsWith('/product/') || location.pathname === '/add' || location.pathname === '/calendar' || location.pathname === '/settings';
  const pageTitle = {
    '/': 'Meus Produtos',
    '/admin': settings.role === 'admin' ? 'Sistema Admin' : 'Administração',
    '/add': 'Novo Produto',
    '/calendar': 'Calendário',
    '/settings': 'Configurações',
  }[location.pathname] || (location.pathname.startsWith('/product/') ? 'Detalhes do Produto' : 'FreshKeep');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 h-16 flex justify-center">
        <div className="w-full max-w-2xl px-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {isSubPage && location.pathname !== '/' ? (
              <NavLink to="/" className="p-2 -ml-2 hover:bg-surface-container-low rounded-full transition-all active:scale-90">
                <ChevronLeft className="w-5 h-5 text-on-surface" />
              </NavLink>
            ) : (
              <div className="p-1.5 -ml-1.5">
                 <div className="w-7 h-7 bg-primary rounded-lg shadow-md shadow-primary/20 flex items-center justify-center">
                   <span className="text-white font-bold text-xs">F</span>
                 </div>
              </div>
            )}
            <h1 className="text-lg font-bold text-on-surface font-h1 tracking-tight">
              {pageTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {settings.role === 'admin' && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Admin Console</span>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-on-surface leading-none">{user?.displayName || user?.email?.split('@')[0]}</span>
              <span className="text-[9px] font-black text-outline uppercase tracking-widest mt-1">
                {settings.role === 'admin' ? 'Administrador' : settings.plan === 'premium' ? 'Plano Premium' : 'Plano Free'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mt-16 flex-grow flex justify-center pb-28">
        <div className="w-full max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center px-4 pb-6 pt-2 pointer-events-none">
        <nav className="w-full max-w-lg pointer-events-auto flex justify-around items-center bg-white/95 backdrop-blur-xl rounded-2xl border border-outline-variant/20 shadow-xl shadow-black/[0.08] h-16 px-4 gap-1">
          <NavLink 
            to="/" 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 flex-1 h-12 rounded-xl gap-0.5",
              isActive ? "text-primary bg-primary/10" : "text-outline hover:bg-surface-container-low"
            )}
          >
            {({ isActive }) => (
              <>
                <Home className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
              </>
            )}
          </NavLink>

          <NavLink 
            to="/calendar" 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 flex-1 h-12 rounded-xl gap-0.5",
              isActive ? "text-primary bg-primary/10" : "text-outline hover:bg-surface-container-low"
            )}
          >
            {({ isActive }) => (
              <>
                <Calendar className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Agenda</span>
              </>
            )}
          </NavLink>

          <NavLink 
            to="/add" 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 flex-1 h-12 rounded-xl gap-0.5",
              isActive ? "text-primary bg-primary/10" : "text-outline hover:bg-surface-container-low"
            )}
          >
            {({ isActive }) => (
              <>
                <PlusSquare className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Novo</span>
              </>
            )}
          </NavLink>

          <NavLink 
            to="/admin" 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 flex-1 h-12 rounded-xl gap-0.5",
              isActive ? "text-primary bg-primary/10" : "text-outline hover:bg-surface-container-low"
            )}
          >
            {({ isActive }) => (
              <>
                {settings.role === 'admin' ? (
                  <ShieldCheck className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                ) : (
                  <LayoutGrid className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">{settings.role === 'admin' ? 'Admin' : 'Painel'}</span>
              </>
            )}
          </NavLink>

          <NavLink 
            to="/settings" 
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center transition-all duration-300 flex-1 h-12 rounded-xl gap-0.5",
              isActive ? "text-primary bg-primary/10" : "text-outline hover:bg-surface-container-low"
            )}
          >
            {({ isActive }) => (
              <>
                <Settings className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Conta</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </div>
  );
};
