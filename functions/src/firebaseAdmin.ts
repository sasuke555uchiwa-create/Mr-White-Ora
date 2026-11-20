import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const FIREBASE_PROJECT_ID = 'mercurial-yew-f6tp2';
export const FIRESTORE_DATABASE_ID = 'ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4';

const app = getApps().length
  ? getApp()
  : initializeApp({ projectId: FIREBASE_PROJECT_ID });

export const db = getFirestore(app, FIRESTORE_DATABASE_ID);
export const adminAuth = getAuth(app);
