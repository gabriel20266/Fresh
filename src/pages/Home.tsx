import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/FirebaseProvider';
import { Product, Category } from '../types';
import { Search, Calendar, ChevronRight, Utensils, ShoppingBag, Plus, Info, Salad, Trash2, Package, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO, isPast, compareAsc, compareDesc } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/format';

// Default category mapping for icons
const DEFAULT_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Laticínios': <Utensils className="w-4 h-4" />,
  'Mercearia': <ShoppingBag className="w-4 h-4" />,
  'Higiene': <Trash2 className="w-4 h-4" />,
  'Frios': <Utensils className="w-4 h-4" />,
  'Bebidas': <ShoppingBag className="w-4 h-4" />,
  'Outros': <Package className="w-4 h-4" />,
};

import { Logo } from '../components/Logo';

export const Home: React.FC = () => {
  const { user, settings, isAdmin, requestPremium } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Todos' | 'Próximos' | 'Vencidos'>('Todos');
  const [sortBy, setSortBy] = useState<'expiryAsc' | 'expiryDesc' | 'name' | 'newest'>('expiryAsc');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = isAdmin 
      ? query(collection(db, 'products'), orderBy('expiryDate', 'asc'))
      : query(
          collection(db, 'products'),
          where('userId', '==', user.uid),
          orderBy('expiryDate', 'asc')
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    return unsubscribe;
  }, [user, isAdmin]);

  const advanceDays = settings.advanceDays;
  const productLimit = settings.plan === 'premium' ? 500 : 50;
  const usagePercentage = Math.min(100, (products.length / productLimit) * 100);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestPremium = async () => {
    await requestPremium();
    setRequestSent(true);
  };

  const stats = {
    total: products.length,
    limit: productLimit,
    expiringSoon: products.filter(p => {
      const days = differenceInDays(parseISO(p.expiryDate), new Date());
      return days >= 0 && days <= advanceDays;
    }).length,
    expired: products.filter(p => isPast(parseISO(p.expiryDate)) && !isToday(parseISO(p.expiryDate))).length,
    totalValueExpiring: products
      .filter(p => {
        const days = differenceInDays(parseISO(p.expiryDate), new Date());
        return days >= 0 && days <= advanceDays;
      })
      .reduce((acc, p) => acc + (p.price || 0), 0)
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const date = parseISO(p.expiryDate);
      if (filter === 'Próximos') {
          const daysLeft = differenceInDays(date, new Date());
          return matchesSearch && daysLeft >= 0 && daysLeft <= advanceDays;
      }
      if (filter === 'Vencidos') return matchesSearch && isPast(date) && !isToday(date);
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'expiryAsc':
          return compareAsc(parseISO(a.expiryDate), parseISO(b.expiryDate));
        case 'expiryDesc':
          return compareDesc(parseISO(a.expiryDate), parseISO(b.expiryDate));
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        default:
          return 0;
      }
    });

  function isToday(date: Date) {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
  }

  const getStatus = (expiryDate: string) => {
    const date = parseISO(expiryDate);
    const daysLeft = differenceInDays(date, new Date());

    if (isPast(date) && !isToday(date)) return { label: 'Vencido', color: 'bg-error', textColor: 'text-error', bgColor: 'bg-error-container' };
    if (daysLeft <= advanceDays) return { label: daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft} dias`, color: 'bg-secondary-container', textColor: 'text-secondary', bgColor: 'bg-secondary-fixed/30' };
    return { label: 'Válido', color: 'bg-primary', textColor: 'text-primary', bgColor: 'bg-primary-fixed/30' };
  };

  const getIcon = (category: string) => {
    return DEFAULT_CATEGORY_ICONS[category] || <Package className="w-4 h-4" />;
  };

  return (
    <div className="px-5 md:px-6 space-y-8 pb-10">
      {/* Persuasive Summary Stats */}
      <section className="pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 text-center space-y-1 hover:shadow-md transition-shadow"
          >
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-on-surface">{stats.total}</p>
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  usagePercentage > 90 ? "bg-error" : usagePercentage > 70 ? "bg-amber-500" : "bg-primary"
                )}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <p className="text-[8px] font-bold text-outline">limite: {stats.limit}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/calendar')}
            className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 text-center space-y-1 hover:shadow-md transition-shadow cursor-pointer hover:border-secondary/30"
          >
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Críticos ({advanceDays}d)</p>
            <p className="text-2xl font-bold text-secondary">{stats.expiringSoon}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 text-center space-y-1 hover:shadow-md transition-shadow"
          >
            <p className="text-[10px] font-bold text-error uppercase tracking-wider">Vencidos</p>
            <p className="text-2xl font-bold text-error">{stats.expired}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/5 p-4 rounded-2xl shadow-sm border border-primary/20 text-center space-y-1 hover:shadow-md transition-shadow ring-1 ring-primary/5"
          >
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Valor em Risco</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValueExpiring, settings.currency || 'BRL')}</p>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="relative flex items-center max-w-xl mx-auto w-full">
        <Search className="absolute left-4 w-4 h-4 text-outline" />
        <input 
          type="text"
          placeholder="Buscar no inventário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant/30 rounded-xl shadow-sm focus:ring-2 focus:ring-primary text-sm font-medium outline-none transition-shadow placeholder:text-outline/40"
        />
      </div>

      {/* Filter and Sort Area */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-3 pb-1">
          <div className="flex gap-2">
            {['Todos', 'Próximos', 'Vencidos'].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t as any)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                  filter === t 
                    ? "bg-primary text-white border-primary" 
                    : "bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high rounded-full px-4 py-2 border border-outline-variant/10">
            <ArrowUpDown className="w-3 h-3 text-outline" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-black text-outline uppercase tracking-widest focus:ring-0 outline-none cursor-pointer pr-1"
            >
              <option value="expiryAsc">Validade (Cresc)</option>
              <option value="expiryDesc">Validade (Decresc)</option>
              <option value="name">Nome (A-Z)</option>
              <option value="newest">Mais Recentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => {
            const status = getStatus(product.expiryDate);
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.23, 1, 0.32, 1], // Custom cubic-bezier for a smoother feel
                  delay: Math.min(index * 0.05, 0.3) // Stagger cards but cap delay at 0.3s
                }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-white p-5 rounded-3xl shadow-sm relative overflow-hidden group border border-outline-variant/10 hover:border-primary-container/20 transition-all cursor-pointer hover:shadow-lg"
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", status.color)}></div>
                <div className="flex justify-center items-center mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", status.bgColor)}>
                    {getIcon(product.category)}
                  </div>
                </div>
                
                <div className="mb-2 flex flex-col items-center text-center">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-1">{product.category}</p>
                  <h2 className="font-bold text-lg text-on-surface leading-tight group-hover:text-primary transition-colors max-w-[200px]">{product.name}</h2>
                  {product.price && (
                    <p className="text-sm font-bold text-primary mt-2">{formatCurrency(product.price, settings.currency || 'BRL')}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mb-4 text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5 opacity-60" />
                  <p className="text-xs">
                    Vence em: <span className={cn("font-bold", status.textColor)}>
                      {format(parseISO(product.expiryDate), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </p>
                </div>

                <div className="w-full bg-surface-container rounded-full h-1 mt-1">
                   <div 
                    className={cn("h-1 rounded-full transition-all duration-500", status.color)} 
                    style={{ width: `${Math.max(10, Math.min(100, 100 - (differenceInDays(parseISO(product.expiryDate), new Date()) * 5)))}%` }}
                   ></div>
                </div>

                <div className="mt-3 flex justify-center">
                  <span className={cn("px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest", status.textColor, status.bgColor)}>
                    {status.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-surface-container-high rounded-full mx-auto flex items-center justify-center opacity-50">
              <Package className="w-8 h-8 text-outline" />
            </div>
            <div className="space-y-1">
              <p className="text-on-surface font-bold">Nada por aqui ainda</p>
              <p className="text-on-surface-variant text-sm max-w-[200px] mx-auto">
                Comece a economizar adicionando seu primeiro produto.
              </p>
            </div>
            <button 
              onClick={() => navigate('/add')}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Adicionar Produto
            </button>
          </div>
        )}
      </div>

      {/* Premium Upgrade Banner */}
      {settings.plan === 'free' && !isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-secondary shadow-lg shadow-secondary/5 p-6 rounded-3xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-3">
             <div className="bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-secondary/20">
               Recomendado
             </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-16 bg-secondary/5 rounded-2xl flex items-center justify-center shrink-0 p-1 border border-secondary/10 shadow-inner overflow-hidden">
               <Logo showText={false} size="md" />
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="text-lg font-black text-on-surface">Plano Premium</h3>
              <p className="text-xs text-outline leading-relaxed max-w-sm">
                Aumente seu limite para <span className="font-bold text-secondary">500 produtos</span> e tenha uma gestão profissional do seu estoque.
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              {settings.premiumStatus === 'pending' || requestSent ? (
                <div className="px-6 py-3 bg-surface-container-high text-outline rounded-xl font-bold text-sm text-center border border-outline-variant/30 flex items-center justify-center gap-2">
                  <Package className="w-4 h-4" />
                  Solicitação Pendente
                </div>
              ) : (
                <button 
                  onClick={handleRequestPremium}
                  className="w-full md:w-auto px-8 py-3 bg-secondary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-secondary/20 active:scale-95 transition-all text-center"
                >
                  Solicitar Upgrade
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Strategy/Tip Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-primary hover:brightness-110 transition-all p-8 rounded-3xl shadow-xl shadow-primary/10 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative text-white"
      >
        <div className="relative z-10 space-y-3 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/10 uppercase tracking-widest">
            <Info className="w-3.5 h-3.5" />
            <span>ESTRATÉGIA FRESHKEEP</span>
          </div>
          <h3 className="text-2xl font-bold leading-tight">Reduza o desperdício</h3>
          <p className="text-sm opacity-90 max-w-sm leading-relaxed">
             Ao organizar os itens por validade, você economiza dinheiro e mantém sua despensa saudável.
          </p>
        </div>
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 rotate-3 shadow-xl">
            <Salad className="w-16 h-16 text-white" />
          </div>
        </div>
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none rotate-12">
             <Salad className="w-48 h-48" />
        </div>
      </motion.div>

      {/* Floating Action Button (FAB) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => navigate('/add')}
        className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-all z-40 md:hidden"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </motion.button>
    </div>
  );
};
