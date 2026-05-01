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
  browserLocalPersistence
} from 'firebase/auth';
import { auth, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserSettings {
  notificationsEnabled: boolean;
  advanceDays: number;
  currency: string;
  photoURL?: string;
  displayName?: string;
  email?: string;
  role: 'admin' | 'client';
  plan: 'free' | 'premium';
  premiumStatus: 'none' | 'pending' | 'approved';
  productCount: number;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({ 
    notificationsEnabled: true, 
    advanceDays: 3,
    currency: 'BRL',
    role: 'client',
    plan: 'free',
    premiumStatus: 'none',
    productCount: 0
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
              const data = docSnap.data();
              setSettings(prev => ({
                ...prev,
                ...data
              }) as UserSettings);
            } else {
              // Initialize settings if first time
              const initialSettings: UserSettings = {
                notificationsEnabled: true,
                advanceDays: 3,
                currency: 'BRL',
                role: authUser.email === 'gabrielpe3109@gmail.com' ? 'admin' : 'client',
                plan: 'free',
                premiumStatus: 'none',
                productCount: 0,
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
            role: 'client',
            plan: 'free',
            premiumStatus: 'none',
            productCount: 0
          });
        }
        setLoading(false);
      });

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

  const requestPremium = async () => {
    if (!user) return;
    await updateSettings({ premiumStatus: 'pending' });
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
    // 1. Database request check for existing email (as requested)
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // We check in a specific 'users' collection mapped by email
      const userRef = doc(db, 'users', email.toLowerCase());
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const error = new Error('auth/email-already-in-use');
        (error as any).code = 'auth/email-already-in-use';
        throw error;
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') throw err;
      console.error("Error during pre-signup check:", err);
      // If Firestore fails for some reason (e.g. offline), we still proceed to Auth 
      // as Auth is the primary source of truth.
    }

    // 2. Proceed with Auth creation
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 3. Save to database
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      // Save settings
      const settingsRef = doc(db, 'userSettings', userCredential.user.uid);
      const settingsData = { 
        ...settings, 
        displayName: name || '', 
        email: email.toLowerCase(),
        plan: 'free',
        productCount: 0,
        updatedAt: new Date().toISOString() 
      };
      await setDoc(settingsRef, settingsData, { merge: true });
      
      // Index email for the requested duplicate check
      const emailRef = doc(db, 'users', email.toLowerCase());
      await setDoc(emailRef, { uid: userCredential.user.uid, createdAt: new Date().toISOString() });
      
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
        setSettings(prev => ({ ...prev, displayName: name, email: email.toLowerCase() }));
      } else {
        setSettings(prev => ({ ...prev, email: email.toLowerCase() }));
      }
    } catch (err) {
      console.error("Error saving user data to DB:", err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, settings, isAdmin, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, logout, updateSettings, updateProfileImage, requestPremium }}>
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
