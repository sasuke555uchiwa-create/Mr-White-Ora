import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();
if (typeof window !== 'undefined') {
  if (appCheckSiteKey) {
    try {
      const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();
      if (import.meta.env.DEV && debugToken) {
        (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
          debugToken === 'true' ? true : debugToken;
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('Firebase App Check initialization skipped:', err);
    }
  } else if (!import.meta.env.DEV) {
    console.warn(
      'VITE_FIREBASE_APPCHECK_SITE_KEY is not configured; Cloud Functions with App Check enforcement may reject requests.'
    );
  }
}

export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore appears offline or unreachable.');
      return false;
    }
    return true;
  }
}

void testConnection();

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider).then((result) => result.user);
};

export const signInWithGoogleRedirect = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
};
