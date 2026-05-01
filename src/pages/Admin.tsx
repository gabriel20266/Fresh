import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/FirebaseProvider';
import { Product, UserCategory } from '../types';
import { 
  Search, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Package, 
  Tag, 
  Calendar, 
  MoreVertical, 
  Filter,
  ArrowUpDown,
  AlertCircle,
  Eye,
  Plus,
  Check,
  X,
  CreditCard,
  User as UserIcon,
  ShieldAlert,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/format';

export const Admin: React.FC = () => {
  const { user, settings, isAdmin, sendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const [verificationSent, setVerificationSent] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'system' | 'notifications'>('products');
  const [sortBy, setSortBy] = useState<'expiryDate' | 'name' | 'price' | 'createdAt'>('expiryDate');

  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to personal products
    const qProducts = isAdmin 
      ? collection(db, 'products') 
      : query(collection(db, 'products'), where('userId', '==', user.uid));
      
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
      setLoading(false);
    });

    // Listen to personal categories
    const qCategories = isAdmin
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('userId', '==', user.uid));
      
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCategory)));
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'categories');
    });

    // If admin, listen to all users, payments and notifications
    let unsubscribeUsers = () => {};
    let unsubscribePayments = () => {};
    let unsubscribeNotifications = () => {};
    
    if (isAdmin) {
      const qUsers = collection(db, 'userSettings');
      unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qPayments = query(collection(db, 'payments'), where('status', '==', 'pendente'));
      unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qNotifications = query(collection(db, 'notifications'), where('status', '==', 'unread'));
      unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeUsers();
      unsubscribePayments();
      unsubscribeNotifications();
    };
  }, [user, isAdmin]);

  const handleApprovePayment = async (paymentId: string, userId: string) => {
    try {
      const { updateDoc, doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Update user settings
      const userRef = doc(db, 'userSettings', userId);
      batch.update(userRef, {
        plan: 'premium',
        productLimit: 500,
        premiumStatus: 'approved',
        updatedAt: serverTimestamp()
      });

      // 2. Update payment document
      const paymentRef = doc(db, 'payments', paymentId);
      batch.update(paymentRef, {
        status: 'aprovado',
        processedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const handleRejectPayment = async (paymentId: string, userId: string) => {
    try {
      const { updateDoc, doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Update user settings
      const userRef = doc(db, 'userSettings', userId);
      batch.update(userRef, {
        premiumStatus: 'rejected',
        updatedAt: serverTimestamp()
      });

      // 2. Update payment document
      const paymentRef = doc(db, 'payments', paymentId);
      batch.update(paymentRef, {
        status: 'rejeitado',
        processedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        status: 'read',
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !user) return;
    const name = newCatName.trim();
    
    // Check if already exists (client-side check for better UX)
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Esta categoria já existe.");
      return;
    }

    try {
      await addDoc(collection(db, "categories"), {
        name,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewCatName('');
      setIsAddingCat(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "categories");
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'product' | 'category' | 'user' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.uid) {
      alert("Você não pode excluir sua própria conta nesta área.");
      return;
    }

    try {
      const batch = writeBatch(db);

      // 1. Delete products
      const qProd = query(collection(db, 'products'), where('userId', '==', userId));
      const snapProd = await getDocs(qProd);
      snapProd.docs.forEach(d => batch.delete(d.ref));

      // 2. Delete categories
      const qCat = query(collection(db, 'categories'), where('userId', '==', userId));
      const snapCat = await getDocs(qCat);
      snapCat.docs.forEach(d => batch.delete(d.ref));

      // 3. Delete payments
      const qPay = query(collection(db, 'payments'), where('userId', '==', userId));
      const snapPay = await getDocs(qPay);
      snapPay.docs.forEach(d => batch.delete(d.ref));

      // 4. Delete user settings
      batch.delete(doc(db, 'userSettings', userId));

      await batch.commit();
      setDeleteId(null);
      setDeleteType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `userSettings/${userId}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setDeleteId(null);
      setDeleteType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const productsInCat = products.filter(p => p.category === name);
    if (productsInCat.length > 0) {
      setErrorMessage(`Não é possível excluir esta categoria pois existem ${productsInCat.length} produtos vinculados a ela.`);
      setTimeout(() => setErrorMessage(null), 5000);
      setDeleteId(null);
      setDeleteType(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeleteId(null);
      setDeleteType(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'expiryDate') return parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime();
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });

  const getStatus = (expiryDate: string) => {
    const date = parseISO(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(date, today);
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();

    if (isPast(date) && !isToday) return { label: 'Vencido', color: 'text-error bg-error/10' };
    if (daysLeft <= (settings.advanceDays || 7)) return { label: 'Crítico', color: 'text-secondary bg-secondary/10' };
    return { label: 'Válido', color: 'text-primary bg-primary/10' };
  };

  if (loading) return null;

  return (
    <div className="px-5 md:px-6 py-4 space-y-6 pb-24">
      {/* Search and Tabs */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-surface-container-high p-1 rounded-2xl w-full mx-auto max-w-md">
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'products' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Estoque
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'categories' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Categorias
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'notifications' ? "bg-white shadow-sm text-primary" : "text-outline"
                )}
              >
                Notificações
                {notifications.length > 0 && (
                  <span className="w-2 h-2 bg-error rounded-full animate-pulse"></span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className={cn(
                  "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5",
                  activeTab === 'system' ? "bg-white shadow-sm text-primary" : "text-outline"
                )}
              >
                Sistema
                {payments.length > 0 && (
                  <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                )}
              </button>
            </>
          )}
        </div>
        
        {activeTab === 'products' && (
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/add')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Produto
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(deleteId || errorMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-0 bottom-24 z-[60] px-5 pointer-events-none"
          >
            <div className="max-w-md mx-auto bg-on-surface text-surface p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-error" />
                <p className="text-xs font-bold leading-tight">
                  {errorMessage || (
                    deleteType === 'product' ? 'Tem certeza que deseja excluir este produto?' : 
                    deleteType === 'category' ? 'Deseja excluir esta categoria?' :
                    'Tem certeza que deseja excluir este usuário? Todos os seus dados serão apagados.'
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {errorMessage ? (
                   <button 
                    onClick={() => setErrorMessage(null)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Fechar
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setDeleteId(null);
                        setDeleteType(null);
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        if (deleteType === 'product') handleDeleteProduct(deleteId!);
                        else if (deleteType === 'category') handleDeleteCategory(deleteId!, products.find(p => p.id === deleteId)?.name || categories.find(c => c.id === deleteId)?.name || '');
                        else if (deleteType === 'user') handleDeleteUser(deleteId!);
                      }}
                      className="px-3 py-1.5 bg-error text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'products' ? (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                type="text" 
                placeholder={isAdmin ? "Pesquisar em todo o estoque..." : "Pesquisar estoque..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-outline-variant/30 bg-white text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-outline/40"
              />
            </div>
            <div className="bg-white border border-outline-variant/30 rounded-2xl p-1 flex items-center shrink-0">
               <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-[10px] font-black text-outline uppercase tracking-widest focus:ring-0 outline-none cursor-pointer pr-8"
              >
                <option value="expiryDate">Validade</option>
                <option value="name">Nome</option>
                <option value="price">Preço</option>
                <option value="createdAt">Cadastro</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-outline/30">
                  <Package className="w-8 h-8" />
                </div>
                <p className="text-outline text-sm">Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const status = getStatus(product.expiryDate);
                const owner = allUsers.find(u => u.id === product.userId);
                return (
                  <motion.div 
                    layout
                    key={product.id}
                    className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden border border-outline-variant/10">
                      {product.imageURL ? (
                        <img src={product.imageURL} className="w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <Package className="w-6 h-6 text-outline/30" />
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm text-on-surface truncate">{product.name}</h3>
                        <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-outline text-[10px] font-medium tracking-tight">
                        <span className="flex items-center gap-1 uppercase">
                          <Tag className="w-2.5 h-2.5" />
                          {product.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {format(parseISO(product.expiryDate), 'dd/MM/yy')}
                        </span>
                        {isAdmin && owner && (
                          <span className="flex items-center gap-1 truncate max-w-[80px]">
                            <Plus className="w-2.5 h-2.5" />
                            {owner.displayName || owner.email?.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        disabled={deleteId === product.id}
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="p-2 hover:bg-primary/10 text-outline hover:text-primary rounded-xl transition-all active:scale-90 disabled:opacity-30"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={deleteId === product.id}
                        onClick={() => navigate(`/product/edit/${product.id}`)}
                        className="p-2 hover:bg-primary/10 text-outline hover:text-primary rounded-xl transition-all active:scale-90 disabled:opacity-30"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteId(product.id);
                          setDeleteType('product');
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-all active:scale-90",
                          deleteId === product.id ? "bg-error text-white" : "hover:bg-error/10 text-outline hover:text-error"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-on-surface">Categorias</h2>
              {!isAddingCat && (
                <button 
                  onClick={() => setIsAddingCat(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Categoria
                </button>
              )}
            </div>

            <AnimatePresence>
              {isAddingCat && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2 mb-4"
                >
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCategory();
                      if (e.key === 'Escape') setIsAddingCat(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border border-primary/30 bg-surface-container-low text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button 
                    onClick={handleCreateCategory}
                    className="p-2 bg-primary text-white rounded-xl active:scale-90 transition-all shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddingCat(false);
                      setNewCatName('');
                    }}
                    className="p-2 bg-surface-container-high text-on-surface-variant rounded-xl active:scale-90 transition-all border border-outline-variant/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-2">
              {categories.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50">
                  <p className="text-xs text-outline italic">Nenhuma categoria encontrada</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 pl-4 bg-surface-container-low rounded-2xl group hover:bg-white transition-all border border-transparent hover:border-outline-variant/30">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-on-surface">{cat.name}</span>
                        {isAdmin && (
                          <span className="text-[8px] text-outline uppercase tracking-wider">
                            UID: {cat.userId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-outline uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-outline-variant/20">
                        {products.filter(p => p.category === cat.name).length} itens
                      </span>
                    </div>
                    {(isAdmin || cat.userId === user?.uid) && (
                      <button 
                        onClick={() => {
                          setDeleteId(cat.id);
                          setDeleteType('category');
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-all active:scale-90",
                          deleteId === cat.id ? "bg-error text-white" : "text-outline hover:text-error hover:bg-error/10"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'notifications' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-on-surface">Notificações</h2>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-dashed border-outline-variant/30">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-outline/20">
                  <Bell className="w-8 h-8" />
                </div>
                <p className="text-outline text-sm">Nenhuma notificação nova</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={notif.id}
                  className="bg-white p-5 rounded-3xl border border-outline-variant/20 shadow-sm flex items-start gap-4"
                >
                  <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Upgrade Premium</span>
                      <span className="text-[9px] text-outline">
                        {notif.createdAt?.toMillis() ? format(notif.createdAt.toMillis(), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-tight">
                      <span className="font-bold">{notif.userName}</span> solicitou o pacote Premium.
                    </p>
                    <p className="text-xs text-outline mb-3">{notif.userEmail}</p>
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => {
                          setActiveTab('system');
                          markNotificationAsRead(notif.id);
                        }}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                      >
                        Ver Pagamento
                      </button>
                      <button 
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="px-4 py-2.5 bg-surface-container-high text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest border border-outline-variant/20 active:scale-95 transition-all"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary p-5 rounded-3xl text-white shadow-lg shadow-primary/20">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Usuários</span>
              <div className="text-3xl font-black mt-1">{allUsers.length}</div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-outline-variant/20 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-outline">Premium Ativos</span>
              <div className="text-3xl font-black mt-1 text-on-surface">
                {allUsers.filter(u => u.plan === 'premium').length}
              </div>
            </div>
          </div>

          {/* Premium Requests */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-secondary" />
                <h2 className="text-lg font-bold text-on-surface">Pagamentos Pendentes</h2>
              </div>
              <span className="px-2.5 py-1 bg-secondary/10 text-secondary text-[10px] font-black rounded-full">
                {payments.length} TOTAL
              </span>
            </div>

            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="py-6 text-center text-outline text-xs italic bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50">
                  Nenhuma solicitação de upgrade pendente
                </div>
              ) : (
                payments.map((p) => {
                  const userReq = allUsers.find(u => u.id === p.userId);
                  return (
                    <div key={p.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-sm font-bold text-on-surface block truncate">
                            {userReq?.displayName || 'Usuário'}
                          </span>
                          <span className="text-[10px] text-outline truncate block">{p.userEmail}</span>
                        </div>
                        <div className="text-[8px] font-black bg-secondary/10 text-secondary px-2 py-1 rounded-full uppercase tracking-widest shrink-0">
                          PENDENTE
                        </div>
                      </div>

                      {p.comprovante_url && (
                        <a 
                          href={p.comprovante_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 bg-white rounded-xl border border-outline-variant/20 text-[10px] font-bold text-primary hover:bg-primary/5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Comprovante
                        </a>
                      )}

                      <div className="text-[8px] text-outline uppercase tracking-wider font-bold">
                        REF: {p.referencia}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprovePayment(p.id, p.userId)}
                          className="flex-1 py-2 px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleRejectPayment(p.id, p.userId)}
                          className="flex-1 py-2 px-4 bg-surface-container-high text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest border border-outline-variant/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* All Users List */}
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-on-surface">Base de Usuários</h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-bold text-on-surface truncate">{u.displayName || u.email?.split('@')[0]}</span>
                      <span className={cn(
                        "text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full w-fit mt-1",
                        u.role === 'admin' ? "bg-on-surface text-surface" : u.plan === 'premium' ? "bg-secondary/20 text-secondary" : "bg-outline/10 text-outline"
                      )}>
                        {u.role === 'admin' ? 'Administrador' : u.plan === 'premium' ? 'Premium' : 'BÁSICO'}
                      </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-black bg-white border border-outline-variant/20 px-2.5 py-1 rounded-full text-outline shadow-inner">
                      {u.productCount || 0}/{u.role === 'admin' ? '∞' : (u.productLimit || 100)} ITENS
                    </span>
                    {u.id !== user?.uid && (
                      <button 
                         onClick={() => {
                          setDeleteId(u.id);
                          setDeleteType('user');
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-all active:scale-90",
                          deleteId === u.id ? "bg-error text-white" : "text-outline hover:text-error hover:bg-error/10"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'system' && (
        <div className="space-y-6">
          <div className="bg-surface-container-high p-5 rounded-3xl border border-outline-variant/10 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-on-surface">Informação</h4>
              <p className="text-xs text-outline leading-relaxed">
                {isAdmin 
                  ? "Como administrador, você visualiza e gerencia todos os produtos e categorias de todos os usuários do sistema."
                  : "Nesta área você pode gerenciar seu estoque de forma detalhada e organizar suas categorias personalizadas."
                }
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-6 rounded-3xl border border-error/20 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-error" />
                <h2 className="text-lg font-bold text-on-surface">Zona de Perigo</h2>
              </div>
              
              <p className="text-xs text-outline leading-relaxed">
                As ações abaixo são irreversíveis. Elas apagarão permanentemente os registros selecionados de toda a base de dados.
              </p>

              <button 
                onClick={async () => {
                  if (window.confirm("ATENÇÃO: Isso apagará TODOS os dados do sistema (Produtos, Usuários, Pagamentos, Categorias). Você precisará redefinir seu acesso admin manualmente no console. Deseja continuar?")) {
                    try {
                      const batch = writeBatch(db);
                      
                      const collections = ['products', 'categories', 'payments', 'userSettings', 'users'];
                      
                      for (const colName of collections) {
                        const snapshot = await getDocs(collection(db, colName));
                        snapshot.docs.forEach((d) => batch.delete(doc(db, colName, d.id)));
                      }
                      
                      await batch.commit();
                      window.location.reload();
                    } catch (err) {
                      alert("Erro ao zerar banco: " + (err instanceof Error ? err.message : "Erro desconhecido"));
                    }
                  }
                }}
                className="w-full py-4 bg-error/10 text-error rounded-2xl text-[10px] font-black uppercase tracking-widest border border-error/20 hover:bg-error hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Zerar Todo o Sistema
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
