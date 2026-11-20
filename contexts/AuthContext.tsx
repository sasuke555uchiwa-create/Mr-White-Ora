import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { buildPublicProfileBackfill } from '../utils/profileBackfill';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  xp: number;
  level: number;
  stats: {
    wins: number;
    hosted: number;
    played: number;
    longestStreak: number;
    currentStreak?: number;
    roleStats?: Record<string, { played: number; wins: number }>;
  };
  connectedAccounts: {
    google: boolean;
    apple: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOffline: boolean;
  refreshProfile: () => Promise<void>;
  refreshAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isOffline: false,
  refreshProfile: async () => {},
  refreshAdminStatus: async () => false,
});

export const useAuth = () => useContext(AuthContext);

const buildDefaultProfile = (currentUser: User): UserProfile => ({
  uid: currentUser.uid,
  displayName: (currentUser.displayName || 'لاعب جديد').slice(0, 50),
  photoURL: currentUser.photoURL || '',
  xp: 0,
  level: 1,
  stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
  connectedAccounts: {
    google: currentUser.providerData.some((p) => p.providerId === 'google.com'),
    apple: currentUser.providerData.some((p) => p.providerId === 'apple.com'),
  },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const unsubProfileRef = useRef<Unsubscribe | null>(null);
  const activeUidRef = useRef<string | null>(null);

  const cleanupProfileListener = useCallback(() => {
    if (unsubProfileRef.current) {
      unsubProfileRef.current();
      unsubProfileRef.current = null;
    }
  }, []);

  const refreshAdminStatus = useCallback(async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsAdmin(false);
      return false;
    }

    try {
      await currentUser.getIdTokenResult();

      try {
        const callable = httpsCallable<undefined, { isAdmin: boolean; shouldRefreshToken: boolean }>(
          functions,
          'checkAdminStatus'
        );
        const res = await callable();
        if (res.data.shouldRefreshToken) {
          await currentUser.getIdTokenResult(true);
        }
        const verified = Boolean(res.data.isAdmin);
        if (activeUidRef.current === currentUser.uid) {
          setIsAdmin(verified);
        }
        return verified;
      } catch {
        // Fallback if Cloud Function is unreachable: verify admins/{uid}.active === true directly
        let docAdmin = false;
        let docExplicitlyInactive = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          docAdmin = adminSnap.exists() && adminSnap.data()?.active === true;
          docExplicitlyInactive = adminSnap.exists() && adminSnap.data()?.active !== true;
        } catch {
          docAdmin = false;
        }
        const isDesignatedOwner =
          currentUser.emailVerified === true &&
          (currentUser.email || '').toLowerCase() === 'sasuke555uchiwa@gmail.com' &&
          !docExplicitlyInactive;
        const verified = Boolean(docAdmin || isDesignatedOwner);
        if (activeUidRef.current === currentUser.uid) {
          setIsAdmin(verified);
        }
        return verified;
      }
    } catch {
      if (activeUidRef.current === currentUser.uid) {
        setIsAdmin(false);
      }
      return false;
    }
  }, []);

  const ensureAndSyncProfile = useCallback(async (currentUser: User) => {
    const uid = currentUser.uid;
    const userRef = doc(db, 'users', uid);
    const publicRef = doc(db, 'publicProfiles', uid);

    try {
      const [userSnap, publicSnap] = await Promise.all([getDoc(userRef), getDoc(publicRef)]);
      if (activeUidRef.current !== uid) return;

      if (!userSnap.exists()) {
        const defaultProf = buildDefaultProfile(currentUser);
        const batch = writeBatch(db);
        batch.set(userRef, {
          ...defaultProf,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (!publicSnap.exists()) {
          batch.set(publicRef, {
            uid,
            displayName: defaultProf.displayName,
            photoURL: defaultProf.photoURL,
            xp: 0,
            level: 1,
            stats: defaultProf.stats,
            updatedAt: serverTimestamp(),
          });
        }
        try {
          await batch.commit();
        } catch (writeErr) {
          console.warn('Could not save initial profile documents, using local copy:', writeErr);
        }
        if (activeUidRef.current === uid) {
          setProfile(defaultProf);
        }
      } else {
        const userData = userSnap.data() as UserProfile;
        if (!publicSnap.exists()) {
          try {
            const batch = writeBatch(db);
            const backfillPayload = buildPublicProfileBackfill(uid, userData);
            batch.set(publicRef, {
              ...backfillPayload,
              updatedAt: serverTimestamp(),
            });
            await batch.commit();
          } catch {
            // Non-blocking sync fallback
          }
        }
        if (activeUidRef.current === uid) {
          setProfile(userData);
        }
      }
    } catch (error: any) {
      if (activeUidRef.current !== uid) return;
      if (error?.message?.includes('offline') || error?.message?.includes('network')) {
        setIsOffline(true);
        setProfile(buildDefaultProfile(currentUser));
      } else {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await ensureAndSyncProfile(currentUser);
  }, [ensureAndSyncProfile]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Always tear down previous user's Firestore subscription before handling account switch/logout
      cleanupProfileListener();

      if (!currentUser) {
        activeUidRef.current = null;
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const targetUid = currentUser.uid;
      activeUidRef.current = targetUid;
      setUser(currentUser);
      setProfile(null);
      setLoading(true);

      await Promise.all([ensureAndSyncProfile(currentUser), refreshAdminStatus()]);

      if (activeUidRef.current !== targetUid) {
        return;
      }

      const userRef = doc(db, 'users', targetUid);
      unsubProfileRef.current = onSnapshot(
        userRef,
        (docSnap) => {
          if (activeUidRef.current !== targetUid) return;
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        },
        (error) => {
          if (activeUidRef.current !== targetUid) return;
          console.warn('Profile snapshot error:', error);
          if (!error.message?.includes('offline')) {
            handleFirestoreError(error, OperationType.GET, `users/${targetUid}`);
          }
        }
      );

      if (activeUidRef.current === targetUid) {
        setLoading(false);
      }
    });

    return () => {
      cleanupProfileListener();
      unsubscribeAuth();
    };
  }, [cleanupProfileListener, ensureAndSyncProfile, refreshAdminStatus]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isOffline,
        refreshProfile,
        refreshAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
