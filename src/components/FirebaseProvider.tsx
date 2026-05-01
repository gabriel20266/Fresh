import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import { auth, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserSettings {
  notificationsEnabled: boolean;
  advanceDays: number;
  currency: string;
  photoURL?: string;
  displayName?: string;
  email?: string;
  role: 'admin' | 'user';
  plan: 'basic' | 'premium';
  premiumStatus: 'none' | 'pending' | 'approved' | 'rejected';
  productCount: number;
  productLimit: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: UserSettings;
  isAdmin: boolean;
  signInWithGoogle: (useRedirect?: boolean) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateProfileImage: (photoURL: string) => Promise<void>;
  requestPremium: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({ 
    notificationsEnabled: true, 
    advanceDays: 3,
    currency: 'BRL',
    role: 'user',
    plan: 'basic',
    premiumStatus: 'none',
    productCount: 0,
    productLimit: 100
  });

  const isAdmin = settings.role === 'admin';

  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.error("Persistence error:", err);
      }

      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          setUser(authUser);
          // Carregar configurações do banco
          try {
            const { doc, getDoc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const docRef = doc(db, 'userSettings', authUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data() as UserSettings;
              // Force admin role if email matches
              if (authUser.email === 'gabrielpe3109@gmail.com' && data.role !== 'admin') {
                data.role = 'admin';
                await setDoc(docRef, { role: 'admin' }, { merge: true });
              }
              setSettings(prev => ({
                ...prev,
                ...data
              }));
            } else {
              // Initialize settings if first time
              const initialSettings: UserSettings = {
                notificationsEnabled: true,
                advanceDays: 3,
                currency: 'BRL',
                role: authUser.email === 'gabrielpe3109@gmail.com' ? 'admin' : 'user',
                plan: 'basic',
                premiumStatus: 'none',
                productCount: 0,
                productLimit: 100,
                email: authUser.email || '',
                displayName: authUser.displayName || ''
              };
              await setDoc(docRef, { ...initialSettings, updatedAt: new Date().toISOString() });
              setSettings(initialSettings);
            }
          } catch (err) {
            console.error("Error loading settings:", err);
          }
        } else {
          setUser(null);
          setSettings({ 
            notificationsEnabled: true, 
            advanceDays: 3,
            currency: 'BRL',
            role: 'user',
            plan: 'basic',
            premiumStatus: 'none',
            productCount: 0,
            productLimit: 100
          });
        }
        setLoading(false);
      });

      // Handle redirect result for Google Login
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Redirect login successful:", result.user.email);
        }
      } catch (err) {
        console.error("Redirect login error:", err);
      }

      return unsubscribe;
    };

    const cleanupPromise = initAuth();

    return () => {
      cleanupPromise.then(unsubscribe => typeof unsubscribe === 'function' && unsubscribe());
    };
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const docRef = doc(db, 'userSettings', user.uid);
      await setDoc(docRef, { ...newSettings, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `userSettings/${user.uid}`);
    }
  };

  const requestPremium = async (comprovanteUrl: string = '') => {
    if (!user) return;
    
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // 1. Create payment record
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        userEmail: user.email,
        comprovante_url: comprovanteUrl,
        referencia: `PREMIUM_${user.uid}_${Date.now()}`,
        status: 'pendente',
        createdAt: serverTimestamp()
      });

      // 2. Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        type: 'premium_request',
        userId: user.uid,
        userEmail: user.email,
        userName: settings.displayName || user.displayName || 'Usuário',
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // 3. Update user status to pending
      await updateSettings({ premiumStatus: 'pending' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payments');
    }
  };

  const sendEmailVerification = async () => {
    if (!user) return;
    await firebaseSendEmailVerification(user);
  };

  const updateProfileImage = async (photoURL: string) => {
    await updateSettings({ photoURL });
  };

  const signInWithGoogle = async (useRedirect = false) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    // 1. Proceed with Auth creation (Firebase handles uniqueness automatically)
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 2. Save to database (onAuthStateChanged will also handle this, but we do it here for immediate name update)
    try {
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      const settingsRef = doc(db, 'userSettings', userCredential.user.uid);
      const settingsData: UserSettings = { 
        ...settings, 
        displayName: name || '', 
        email: email.toLowerCase(),
        role: email.toLowerCase() === 'gabrielpe3109@gmail.com' ? 'admin' : 'user',
        plan: 'basic',
        productCount: 0,
        productLimit: 100
      };
      await setDoc(settingsRef, { ...settingsData, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error("Error saving user data during signup:", err);
      // We don't throw here because the Auth account was created successfully
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, settings, isAdmin, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, logout, updateSettings, updateProfileImage, requestPremium, sendEmailVerification }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};
