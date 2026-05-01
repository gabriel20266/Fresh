import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/FirebaseProvider';
import { Product } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'products'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    return unsubscribe;
  }, [user]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getProductsForDate = (date: Date) => {
    return products.filter(p => isSameDay(parseISO(p.expiryDate), date));
  };

  const selectedProducts = selectedDate ? getProductsForDate(selectedDate) : [];

  return (
    <div className="px-5 md:px-6 space-y-6 pb-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-black/[0.03] border border-outline-variant/20"
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black text-on-surface capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Calendário de Validade</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              className="p-2.5 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2.5 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center py-2">
              <span className="text-[10px] font-black text-outline/50 uppercase">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayProducts = getProductsForDate(day);
            const hasProducts = dayProducts.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all active:scale-95",
                  !isCurrentMonth && "opacity-20",
                  isSelected 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : isToday 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-surface-container-low text-on-surface"
                )}
              >
                <span className={cn("text-xs font-bold", isSelected ? "font-black" : "")}>
                  {format(day, 'd')}
                </span>
                
                {hasProducts && (
                  <div className="absolute bottom-2 flex gap-0.5">
                    {dayProducts.slice(0, 3).map((_, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white" : "bg-primary"
                        )} 
                      />
                    ))}
                    {dayProducts.length > 3 && (
                      <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/50" : "bg-primary/50")} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected Day Details */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div 
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-on-surface">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <span className="text-[10px] font-black text-outline uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
                {selectedProducts.length} {selectedProducts.length === 1 ? 'Produto' : 'Produtos'}
              </span>
            </div>

            {selectedProducts.length > 0 ? (
              <div className="space-y-3">
                {selectedProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-outline uppercase tracking-wider">{product.category}</p>
                      <h4 className="font-bold text-on-surface truncate">{product.name}</h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-outline/30" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low/50 border border-dashed border-outline-variant/30 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
                  <Package className="w-6 h-6 text-outline/20" />
                </div>
                <p className="text-sm font-bold text-outline">Nenhum produto vence nesta data</p>
                <p className="text-[10px] text-outline/60 mt-1 max-w-[180px]">Fique tranquilo, sua despensa está segura para este dia.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
