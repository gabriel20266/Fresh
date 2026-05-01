import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/FirebaseProvider';
import { Product, Category } from '../types';
import { Calendar, Tag, FileText, Edit, Trash2, AlertCircle, ShoppingBasket, CircleDollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/format';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const advanceDays = settings.advanceDays;

  useEffect(() => {
    if (!id || !user) return;

    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Product;
          if (data.userId === user.uid) {
            setProduct({ id: docSnap.id, ...data });
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user, navigate]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  if (loading) return null;
  if (!product) return <div>Produto não encontrado</div>;

  const getStatus = (expiryDate: string) => {
    const date = parseISO(expiryDate);
    const daysLeft = differenceInDays(date, new Date());
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    if (isPast(date) && !isToday) return { label: 'Vencido', color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' };
    if (daysLeft <= advanceDays) return { label: daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft} dias`, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' };
    return { label: 'Válido', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' };
  };

  const status = getStatus(product.expiryDate);

  return (
    <div className="px-5 md:px-6 py-6 max-w-lg mx-auto space-y-6">
      {/* Product Image Area */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-xl shadow-black/[0.03] border border-outline-variant/30 flex items-center justify-center relative">
          {product.imageURL ? (
            <img src={product.imageURL} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBasket className="w-24 h-24 text-primary opacity-90" />
          )}
        </div>
        
        {/* Floating Status Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] shadow-lg rounded-xl py-2 px-4 flex items-center justify-center gap-2 border backdrop-blur-md",
            status.bgColor, "border-black/5"
          )}
        >
          <AlertCircle className={cn("w-4 h-4", status.textColor)} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", status.textColor)}>
            {status.label}
          </span>
        </motion.div>
      </motion.div>

      {/* Title */}
      <div className="text-center pt-4">
        <h2 className="text-2xl font-bold text-on-surface mb-1">{product.name}</h2>
        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{product.category}</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/30">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Fresco</span>
          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Vencido</span>
        </div>
        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000 rounded-full", status.color)} 
            style={{ width: `${Math.max(5, Math.min(100, 100 - (differenceInDays(parseISO(product.expiryDate), new Date()) * 5)))}%` }}
          ></div>
        </div>
      </div>

      {/* Detail List */}
      <div className="space-y-3">
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", status.bgColor)}>
            <Calendar className={cn("w-4 h-4", status.textColor)} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-outline block mb-0.5 uppercase tracking-wider">DATA DE VALIDADE</span>
            <span className={cn("text-sm font-bold uppercase tracking-tight", status.textColor)}>
              {format(parseISO(product.expiryDate), "dd MMM yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
            <Tag className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-outline block mb-0.5 uppercase tracking-wider">CATEGORIA</span>
            <span className="text-sm font-medium text-on-surface">
              {product.category}
            </span>
          </div>
        </div>

        {product.price && (
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed/30 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-outline block mb-0.5 uppercase tracking-wider">PREÇO</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(product.price, settings.currency || 'BRL')}
              </span>
            </div>
          </div>
        )}

        {product.observations && (
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-outline-variant/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
              <FileText className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-bold text-outline block mb-0.5 uppercase tracking-wider">OBSERVAÇÕES</span>
              <p className="text-xs text-on-surface-variant italic">
                "{product.observations}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <button 
          onClick={() => navigate(`/product/edit/${product.id}`)}
          className="w-full h-11 bg-white border border-primary text-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-fixed/20 transition-all active:scale-[0.98]"
        >
          <Edit className="w-4 h-4" />
          Editar Produto
        </button>
        <button 
          onClick={handleDelete}
          className="w-full h-11 text-error font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-error-container/20 transition-all active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" />
          Excluir Produto
        </button>
      </div>
    </div>
  );
};
