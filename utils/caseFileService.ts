import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ClassifiedCaseFile } from '../types';
import { getLocalCaseFiles } from '../services/storageService';

export async function fetchOnlineCaseFile(reportId: string): Promise<ClassifiedCaseFile | null> {
  if (!reportId) return null;
  const ref = doc(db, 'matchReports', reportId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as ClassifiedCaseFile;
}

export async function fetchUserOnlineCaseFiles(
  uid: string,
  limitCount = 25
): Promise<ClassifiedCaseFile[]> {
  if (!uid) return [];
  const q = query(
    collection(db, 'matchReports'),
    where('participantIds', 'array-contains', uid),
    orderBy('endedAtMs', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ClassifiedCaseFile);
}

export function mergeCaseFileArchives(
  localFiles: readonly ClassifiedCaseFile[],
  onlineFiles: readonly ClassifiedCaseFile[]
): ClassifiedCaseFile[] {
  const map = new Map<string, ClassifiedCaseFile>();
  for (const item of onlineFiles) {
    if (item?.reportId) {
      map.set(item.reportId, item);
    }
  }
  for (const item of localFiles) {
    if (item?.reportId && !map.has(item.reportId)) {
      map.set(item.reportId, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.endedAtMs - a.endedAtMs);
}

export function getCachedLocalCaseFiles(): ClassifiedCaseFile[] {
  return getLocalCaseFiles();
}
