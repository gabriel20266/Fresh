import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, increment } from '../lib/firebase';
import { useAuth } from '../components/FirebaseProvider';
import { Category, UserCategory } from '../types';
import { ShoppingBasket, Calendar, Utensils, ShoppingBag, Trash2, Package, Save, Lightbulb, CircleDollarSign, ImagePlus, X, Camera, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { CURRENCIES } from '../lib/format';
import { resizeImage } from '../lib/image';

export const AddProduct: React.FC = () => {
  const { user, settings, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    expiryDate: '',
    category: '' as Category,
    price: '',
    observations: '',
    imageURL: ''
  });
  const [dateWarning, setDateWarning] = useState(false);

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'categories'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const customCategories = snapshot.docs.map(doc => (doc.data() as UserCategory).name);
      setCategories(customCategories);
      
      if (customCategories.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: customCategories[0] }));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
      setShowCategoryDialog(false);
      await fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setFormData({ ...formData, expiryDate: date });
    if (date) {
      const selected = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDateWarning(selected < today);
    } else {
      setDateWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.expiryDate) return;

    const limit = settings.productLimit || (settings.plan === 'premium' ? 500 : 100);
    
    setLoading(true);
    try {
      if (!isAdmin) {
        // Check current count
        const q = query(collection(db, 'products'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.size >= limit) {
          alert(`Você atingiu o limite de ${limit} produtos para o seu plano ${settings.plan === 'premium' ? 'Premium' : 'Básico'}.`);
          setLoading(false);
          return;
        }
      }

      const { price, imageURL, ...rest } = formData;
      await addDoc(collection(db, 'products'), {
        ...rest,
        price: price ? parseFloat(price) : null,
        imageURL: imageURL || null,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update productCount in userSettings
      const settingsRef = doc(db, 'userSettings', user.uid);
      await updateDoc(settingsRef, {
        productCount: increment(1),
        updatedAt: serverTimestamp()
      });

      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resized = await resizeImage(file);
      setFormData(prev => ({ ...prev, imageURL: resized }));
    }
  };

  return (
    <div className="px-5 md:px-6 py-6 max-w-lg mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant/30"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Upload */}
          <div className="space-y-1.5 pb-2">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Imagem do Produto (Opcional)</label>
            <div className="relative group">
              <input 
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="product-image"
              />
              <label 
                htmlFor="product-image"
                className={cn(
                  "block w-full aspect-video rounded-2xl border-2 border-dashed border-outline-variant/50 bg-surface-container-low overflow-hidden cursor-pointer transition-all hover:border-primary/50 relative",
                  formData.imageURL ? "border-solid border-primary/20" : ""
                )}
              >
                <AnimatePresence mode="wait">
                  {formData.imageURL ? (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full relative"
                    >
                      <img src={formData.imageURL} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, imageURL: '' });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                        <ImagePlus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tight">Toque para selecionar</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </label>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Nome do Produto</label>
            <div className="relative">
              <ShoppingBasket className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                type="text"
                required
                placeholder="Ex: Leite Integral"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-outline/40"
              />
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Data de Validade</label>
              {dateWarning && (
                <span className="text-[9px] font-black text-error animate-pulse uppercase tracking-tight">Produto Vencido!</span>
              )}
            </div>
            <div className="relative">
              <Calendar className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", dateWarning ? "text-error" : "text-outline")} />
              <input 
                type="date"
                required
                value={formData.expiryDate}
                onChange={handleDateChange}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border bg-surface-container-low text-sm focus:ring-2 outline-none transition-all",
                  dateWarning 
                    ? "border-error/50 focus:ring-error text-error" 
                    : "border-outline-variant focus:ring-primary text-on-surface"
                )}
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">
              Preço ({CURRENCIES.find(c => c.code === (settings.currency || 'BRL'))?.symbol || 'R$'}) - Opcional
            </label>
            <div className="relative">
              <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-outline/40"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest leading-none">Categoria</label>
              <button 
                type="button"
                onClick={() => setShowCategoryDialog(true)}
                className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3" />
                Nova
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <div className="w-full p-4 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/50 text-center space-y-2">
                  <p className="text-[10px] text-outline font-medium">Você ainda não tem categorias.</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={cn(
                      "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 active:scale-95 shadow-sm",
                      formData.category === cat 
                        ? "border-primary text-primary bg-primary/10" 
                        : "border-outline-variant/30 text-on-surface-variant bg-white hover:border-primary/50"
                    )}
                  >
                    <span className="text-xs font-bold">{cat}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* New Category Dialog */}
          <AnimatePresence>
            {showCategoryDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCategoryDialog(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-on-surface">Nova Categoria</h3>
                    <p className="text-xs text-on-surface-variant">Como você quer chamar essa categoria?</p>
                  </div>
                  
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Ex: Congelados, Padaria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-sm focus:ring-2 focus:ring-primary outline-none"
                  />

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowCategoryDialog(false)}
                      className="flex-1 py-3 text-sm font-bold text-outline hover:bg-surface-container-high rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddCategory}
                      className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                      Criar Categoria
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Observations */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Observações</label>
            <textarea 
              placeholder="Algum detalhe adicional..."
              rows={3}
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none placeholder:text-outline/40"
            />
          </div>

          <div className="pt-2">
             <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Produto'}
              </button>
          </div>
        </form>
      </motion.div>

      {/* Tip Card */}
      <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-4 border border-primary/10">
        <div className="bg-primary-container p-2 rounded-lg">
          <Lightbulb className="w-4 h-4 text-on-primary-container" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-primary mb-0.5">Dica de Conservação</h3>
          <p className="text-xs text-on-surface-variant">
            Produtos abertos duram menos. Tente anotar a data de abertura nas observações.
          </p>
        </div>
      </div>
    </div>
  );
};
