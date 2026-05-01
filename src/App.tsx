import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AddProduct } from './pages/AddProduct';
import { ProductDetails } from './pages/ProductDetails';
import { EditProduct } from './pages/EditProduct';
import { Settings } from './pages/Settings';
import { Calendar } from './pages/Calendar';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';

import { motion } from 'motion/react';

import { Logo } from './components/Logo';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-10">
      <motion.div 
        animate={{ 
          scale: [0.98, 1.02, 0.98],
          opacity: [0.8, 1, 0.8]
        }} 
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          ease: "easeInOut"
        }}
        className="flex flex-col items-center gap-6"
      >
        <Logo size="md" />
        <div className="w-8 h-1 bg-primary/10 rounded-full overflow-hidden mt-4">
          <motion.div 
            animate={{ x: [-20, 40] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-4 h-full bg-primary"
          />
        </div>
      </motion.div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AuthenticatedApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/add" element={<AddProduct />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/product/edit/:id" element={<EditProduct />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </FirebaseProvider>
  );
}
