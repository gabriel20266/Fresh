import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/FirebaseProvider';
import { Bell, CloudUpload, Trash2, Info, LogOut, ChevronRight, CheckCircle2, CircleDollarSign, Camera, Loader2, User as UserIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { CURRENCIES } from '../lib/format';

export const Settings: React.FC = () => {
  const { user, logout, settings, updateSettings, updateProfileImage } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState<{ type: 'clear' | 'backup' | 'success' | 'updating', message: string } | null>(null);

  const notificationsEnabled = settings.notificationsEnabled;
  const advanceDays = settings.advanceDays;
  const currentCurrency = settings.currency || 'BRL';

  const handleUpdateApp = () => {
    setModal({ type: 'updating', message: 'Sincronizando dados e otimizando o cache do sistema para melhor desempenho...' });
    
    // Simulate optimization/update process
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const img = new Image();
        img.onload = async () => {
          // Resize profile image to max 400x400
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 400;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress quality to 0.7 to ensure it's well under 1MB
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          try {
            await updateProfileImage(compressedBase64);
            setModal({ type: 'success', message: 'Sua foto de perfil foi atualizada com sucesso!' });
          } catch (error) {
            console.error("Erro ao fazer upload:", error);
          } finally {
            setUploading(false);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao ler arquivo:", error);
      setUploading(false);
    }
  };

  const handleToggleNotifications = () => {
    updateSettings({ notificationsEnabled: !notificationsEnabled });
  };

  const handleSetDays = (days: number) => {
    updateSettings({ advanceDays: days });
  };

  const handleSetCurrency = (code: string) => {
    updateSettings({ currency: code });
  };

  const handleClearHistory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'products'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setModal({ type: 'success', message: 'Todo o seu inventário foi limpo com sucesso.' });
    } catch (error) {
      console.error("Erro ao limpar inventário:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    setModal({ type: 'success', message: 'Seus dados já estão sincronizados e seguros na nuvem.' });
  };

  const handleExportCSV = async () => {
    if (!user) return;
    try {
      // Don't use the full screen loader as it can interrupt the download context in some browsers
      const q = query(collection(db, 'products'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const productsData = querySnapshot.docs.map(doc => doc.data());
      
      if (productsData.length === 0) {
        setModal({ type: 'success', message: 'Nenhum produto encontrado para exportar.' });
        return;
      }

      // CSV Header
      let csvContent = "Nome,Validade,Categoria,Preco,Observacoes\n";
      
      // CSV Rows
      productsData.forEach(p => {
        const name = (p.name || '').toString().replace(/"/g, '""');
        const expiryDate = p.expiryDate || '';
        const category = (p.category || 'Outros').toString().replace(/"/g, '""');
        const price = p.price || 0;
        const observations = (p.observations || '').toString().replace(/"/g, '""');

        const row = [
          `"${name}"`,
          expiryDate,
          `"${category}"`,
          price,
          `"${observations}"`
        ].join(",");
        csvContent += row + "\n";
      });

      // Create blob with BOM for Excel compatibility (UTF-8)
      const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `freshkeep_inventario_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setModal({ type: 'success', message: 'Seu inventário foi exportado em formato CSV com sucesso!' });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      setModal({ type: 'success', message: 'Ocorreu um erro ao exportar seus dados. Por favor, tente novamente.' });
    }
  };

  if (loading && !modal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-6 py-6 max-w-lg mx-auto space-y-8 relative">
      
      <AnimatePresence>
        {modal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-md p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-4 text-center"
            >
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-surface-container-high">
                {modal.type === 'clear' && <Trash2 className="w-7 h-7 text-error" />}
                {(modal.type === 'success' || modal.type === 'backup') && <CheckCircle2 className="w-7 h-7 text-primary" />}
                {modal.type === 'updating' && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-on-surface">
                  {modal.type === 'clear' ? 'Limpar?' : modal.type === 'updating' ? 'Atualizando' : 'Concluído'}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {modal.message}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {modal.type === 'clear' ? (
                  <>
                    <button onClick={handleClearHistory} className="w-full py-3.5 rounded-xl bg-error text-white font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all">Sim, Limpar Tudo</button>
                    <button onClick={() => setModal(null)} className="w-full py-3.5 rounded-xl border border-outline-variant font-bold text-sm hover:bg-surface-container-low active:scale-[0.98] transition-all">Cancelar</button>
                  </>
                ) : modal.type === 'updating' ? (
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                      className="h-full bg-primary"
                    />
                  </div>
                ) : (
                  <button onClick={() => setModal(null)} className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all">Entendido</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-32 w-full rounded-3xl overflow-hidden mb-2 shadow-xl shadow-primary/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary-container"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute bottom-6 left-6 flex items-center gap-4 text-white">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl bg-white/10 backdrop-blur-md">
              {settings.photoURL || user?.photoURL ? (
                <img 
                  src={settings.photoURL || user?.photoURL || ''} 
                  alt="User" 
                  className={cn("w-full h-full object-cover", uploading && "opacity-30")}
                />
              ) : (
                <UserIcon className="w-6 h-6 text-white/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-lg border border-primary/20 cursor-pointer active:scale-90 transition-transform hover:bg-surface-container-low">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
          <div className="space-y-1 flex-1">
            <input 
              type="text" 
              value={settings.displayName || ''} 
              onChange={(e) => updateSettings({ displayName: e.target.value })}
              placeholder="Seu Nome"
              className="bg-transparent border-none text-xl font-bold leading-none p-0 focus:ring-0 w-full placeholder:text-white/40 text-white"
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/20">
                {settings.role === 'admin' ? 'Administrador' : settings.plan === 'premium' ? 'Plano Premium' : 'Plano Free'}
              </span>
              <p className="text-sm opacity-80 font-medium truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Subscription Plan */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-2">
          <CircleDollarSign className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Plano e Assinatura</span>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden relative">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                  settings.plan === 'premium' ? "bg-primary text-white shadow-primary/20" : "bg-surface-container-highest text-outline"
                )}>
                  {settings.plan === 'premium' ? <CheckCircle2 className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">
                    Plano {settings.plan === 'premium' ? 'Premium' : 'Básico'}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Limite: {settings.plan === 'premium' ? '500' : '100'} produtos
                  </p>
                </div>
              </div>
              {settings.plan === 'free' && (
                <div className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter">
                  Grátis
                </div>
              )}
            </div>

            {settings.plan === 'free' && (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Precisa de mais espaço? O plano Premium permite até <b>500 produtos</b> e suporte priorizado.
                </p>
                <button 
                  onClick={() => {
                    updateSettings({ plan: 'premium' });
                    setModal({ type: 'success', message: 'Parabéns! Você agora é um usuário Premium. Seu limite foi aumentado para 500 produtos.' });
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <CircleDollarSign className="w-5 h-5" />
                  Upgrade para Premium
                </button>
              </div>
            )}

            {settings.plan === 'premium' && (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary opacity-80 uppercase tracking-widest">Status da Conta</p>
                  <p className="text-sm font-bold text-on-surface">Assinatura Ativa</p>
                </div>
                <button 
                  onClick={() => {
                    updateSettings({ plan: 'free' });
                    setModal({ type: 'success', message: 'Sua assinatura foi alterada para o plano básico.' });
                  }}
                  className="text-[10px] font-bold text-outline hover:text-error transition-colors uppercase tracking-widest"
                >
                  Cancelar Plano
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Notifications */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Notificações</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Alertas</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Lembretes de validade ativados</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          <div className="p-5 pt-0 space-y-4">
            <div className="h-px bg-outline-variant/10 w-full" />
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-on-surface">Antecedência avisada</h3>
              <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                {advanceDays} {advanceDays === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            
            <div className="space-y-6">
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1"
                value={advanceDays}
                onChange={(e) => handleSetDays(parseInt(e.target.value))}
                className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
              />
              
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 7, 15].map((days) => (
                  <button 
                    key={days}
                    onClick={() => handleSetDays(days)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all active:scale-95",
                      advanceDays === days 
                        ? "border-2 border-primary bg-primary/5 shadow-inner" 
                        : "border-outline-variant/30 bg-white hover:border-primary opacity-60"
                    )}
                  >
                    <span className={cn("text-base font-bold", advanceDays === days ? "text-primary" : "text-on-surface")}>{days}</span>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", advanceDays === days ? "text-primary" : "text-outline")}>DIAS</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Preferences Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-2">
          <CircleDollarSign className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Preferências</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3">Moeda do Aplicativo</h3>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleSetCurrency(curr.code)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border transition-all active:scale-[0.98]",
                    currentCurrency === curr.code
                      ? "border-2 border-primary bg-primary/5 shadow-inner"
                      : "border-outline-variant/30 bg-white hover:border-primary/50"
                  )}
                >
                  <span className={cn("text-xs font-bold", currentCurrency === curr.code ? "text-primary" : "text-on-surface")}>
                    {curr.label}
                  </span>
                  <span className={cn("text-[10px] font-bold opacity-60", currentCurrency === curr.code ? "text-primary/70" : "text-outline")}>
                    {curr.symbol} ({curr.code})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Data Management */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-2">
          <CloudUpload className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Gerenciamento</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 divide-y divide-outline-variant/20">
          <button 
            onClick={handleBackup}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low/50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CloudUpload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Backup</h3>
                <p className="text-xs text-on-surface-variant">Sincronização ativa</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </button>

          <button 
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low/50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Exportar Dados</h3>
                <p className="text-xs text-on-surface-variant">Baixar inventário em CSV</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </button>

          <button 
            onClick={() => setModal({ type: 'clear', message: 'Isso apagará todos os itens do seu inventário. Tem certeza?' })}
            className="w-full flex items-center justify-between p-5 hover:bg-error/5 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-error" />
              </div>
              <div>
                <h3 className="text-base font-bold text-error">Limpar Tudo</h3>
                <p className="text-xs text-on-surface-variant font-medium">Remover todos os itens</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-outline" />
          </button>
        </div>
      </motion.section>

      {/* App Info */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 px-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Software</span>
        </div>
        <div className="bg-white rounded-2xl border border-outline-variant/30 p-5 space-y-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-base font-bold text-on-surface block">Sistema</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Versão 2.4.0 (BUILD 82)</span>
            </div>
            <button 
              onClick={handleUpdateApp}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Atualizar App
            </button>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-error/20 text-error font-bold text-sm hover:bg-error/5 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </motion.section>

      <div className="text-center text-outline/40 pb-16 space-y-1">
        <p className="text-xs font-bold tracking-widest uppercase">FreshKeep © 2024</p>
        <div className="flex items-center justify-center gap-1">
          <span className="w-1 h-1 bg-outline/20 rounded-full"></span>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Sempre fresco, sempre pronto</p>
          <span className="w-1 h-1 bg-outline/20 rounded-full"></span>
        </div>
      </div>
    </div>
  );

};
