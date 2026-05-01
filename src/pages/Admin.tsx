import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/format';

export const Admin: React.FC = () => {
  const { user, settings } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [sortBy, setSortBy] = useState<'expiryDate' | 'name' | 'price' | 'createdAt'>('expiryDate');

  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to products
    const qProducts = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
      setLoading(false);
    });

    // Listen to categories
    const qCategories = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCategory)));
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'categories');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [user]);

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
  const [deleteType, setDeleteType] = useState<'product' | 'category' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <div className="flex bg-surface-container-high p-1 rounded-2xl w-full max-w-xs mx-auto">
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'products' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Produtos
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'categories' ? "bg-white shadow-sm text-primary" : "text-outline"
            )}
          >
            Categorias
          </button>
        </div>
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
                  {errorMessage || (deleteType === 'product' ? 'Tem certeza que deseja excluir este produto?' : 'Deseja excluir esta categoria?')}
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
                        else handleDeleteCategory(deleteId!, products.find(p => p.id === deleteId)?.name || categories.find(c => c.id === deleteId)?.name || '');
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
                placeholder="Pesquisar estoque..." 
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
                        {product.price && (
                          <span className="flex items-center gap-1 text-primary">
                            <ArrowUpDown className="w-2.5 h-2.5" />
                            {formatCurrency(product.price, settings.currency || 'BRL')}
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
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-on-surface">Minhas Categorias</h2>
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
                  <p className="text-xs text-outline italic">Você ainda não criou categorias personalizadas</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 pl-4 bg-surface-container-low rounded-2xl group hover:bg-white transition-all border border-transparent hover:border-outline-variant/30">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      <span className="font-bold text-sm text-on-surface">{cat.name}</span>
                      <span className="text-[9px] font-bold text-outline uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-outline-variant/20">
                        {products.filter(p => p.category === cat.name).length} itens
                      </span>
                    </div>
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
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface-container-high p-5 rounded-3xl border border-outline-variant/10 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-on-surface">Informação</h4>
              <p className="text-xs text-outline leading-relaxed">
                Você pode criar categorias específicas no momento de adicionar ou editar um produto. A exclusão de uma categoria só é permitida quando não houver produtos vinculados a ela.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
