/**
 * ClassDesk Client-side Storage Synchronization Helper
 * Ensures zero data loss: combines live Supabase database with persistent
 * local storage fallback so newly added records are never lost on page refresh,
 * even before Supabase SQL tables are initialized.
 * Provides strict multi-tenant data isolation per institute/center.
 */

export function getLocalData<T>(key: string, fallback: T[] = []): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`classdesk_${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_DEMO_INSTITUTE_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Returns records filtered strictly for the given institute/center.
 * If instituteId is null/undefined (e.g. platform super-admin), returns all records.
 * For any specific institute, strictly returns only items where item.institute_id === instituteId.
 */
export function getLocalDataForInstitute<T extends { institute_id?: string | null }>(
  key: string,
  instituteId?: string | null,
  fallback: T[] = []
): T[] {
  const all = getLocalData<T>(key, fallback);
  if (!instituteId) return all;
  const isDefaultDemo = instituteId === DEFAULT_DEMO_INSTITUTE_ID;
  const filtered = all.filter((item) => {
    if (isDefaultDemo) {
      return !item.institute_id || item.institute_id === instituteId;
    }
    return item.institute_id === instituteId;
  });
  return filtered;
}

export function saveLocalData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`classdesk_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`[storage-helper] Error saving classdesk_${key}:`, e);
  }
}

export function appendLocalData<T extends { id?: string; institute_id?: string | null }>(
  key: string,
  item: T,
  instituteId?: string | null
): T[] {
  const current = getLocalData<T>(key);
  const effectiveInstId = item.institute_id || instituteId || null;
  const itemWithInst: T = {
    ...item,
    ...(effectiveInstId ? { institute_id: effectiveInstId } : {}),
  };
  // Avoid duplicate IDs
  const filtered = item.id ? current.filter((x) => x.id !== item.id) : current;
  const updated = [itemWithInst, ...filtered];
  saveLocalData(key, updated);

  if (instituteId) {
    if (instituteId === DEFAULT_DEMO_INSTITUTE_ID) {
      return updated.filter((x) => !x.institute_id || x.institute_id === instituteId);
    }
    return updated.filter((x) => x.institute_id === instituteId);
  }
  return updated;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function updateLocalData<T extends { id?: string; institute_id?: string | null } = any>(
  key: string,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Partial<T> | Record<string, any>,
  instituteId?: string | null
): T[] {
  const current = getLocalData<T>(key);
  const updated = current.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates, updated_at: new Date().toISOString() };
    }
    return item;
  });
  saveLocalData(key, updated);
  if (instituteId) {
    if (instituteId === DEFAULT_DEMO_INSTITUTE_ID) {
      return updated.filter((x) => !x.institute_id || x.institute_id === instituteId);
    }
    return updated.filter((x) => x.institute_id === instituteId);
  }
  return updated;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeLocalData<T extends { id?: string; institute_id?: string | null } = any>(
  key: string,
  id: string,
  instituteId?: string | null
): T[] {
  const current = getLocalData<T>(key);
  const updated = current.filter((x) => x.id !== id);
  saveLocalData(key, updated);
  if (instituteId) {
    if (instituteId === DEFAULT_DEMO_INSTITUTE_ID) {
      return updated.filter((x) => !x.institute_id || x.institute_id === instituteId);
    }
    return updated.filter((x) => x.institute_id === instituteId);
  }
  return updated;
}

/**
 * Merges remote Supabase records with unsynced local records without data loss.
 * Preserves multi-tenant isolation by keeping other institutes' local data intact in storage,
 * and returning only the records belonging to the requested instituteId.
 */
export function syncLocalWithRemote<T extends { id?: string; institute_id?: string | null }>(
  key: string,
  remoteData: T[],
  instituteId?: string | null
): T[] {
  const local = getLocalData<T>(key);
  const isDefaultDemo = instituteId === DEFAULT_DEMO_INSTITUTE_ID;

  if (!remoteData || remoteData.length === 0) {
    if (instituteId) {
      return local.filter((l) =>
        isDefaultDemo ? !l.institute_id || l.institute_id === instituteId : l.institute_id === instituteId
      );
    }
    return local;
  }

  const validRemote = instituteId
    ? (isDefaultDemo
        ? remoteData.filter((r) => !r.institute_id || r.institute_id === instituteId)
        : remoteData.filter((r) => r.institute_id === instituteId))
    : remoteData;

  const remoteIds = new Set(validRemote.map((r) => r.id).filter(Boolean));

  // Local items for this institute that haven't synced yet
  const unsyncedThisInst = local.filter(
    (l) =>
      l.id &&
      !remoteIds.has(l.id) &&
      (!instituteId ||
        (isDefaultDemo ? !l.institute_id || l.institute_id === instituteId : l.institute_id === instituteId))
  );

  // Preserve local items belonging to other institutes in localStorage
  const otherInstData = instituteId
    ? local.filter((l) =>
        isDefaultDemo ? l.institute_id && l.institute_id !== instituteId : l.institute_id !== instituteId
      )
    : [];

  const mergedThis = [...validRemote, ...unsyncedThisInst];
  const total = [...mergedThis, ...otherInstData];
  saveLocalData(key, total);

  return mergedThis;
}
