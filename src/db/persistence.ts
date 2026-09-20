import { useState, useEffect, useCallback } from 'react';

export interface PersistenceInfo {
  persisted: boolean;
  supported: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  availableBytes?: number;
  usagePercent?: number;
  error?: string;
}

/**
 * Checks and requests persistent storage via navigator.storage.persist().
 * This ensures Chrome does not evict local IndexedDB / OPFS data under storage pressure.
 */
export async function ensurePersistentStorage(): Promise<PersistenceInfo> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return {
      persisted: false,
      supported: false,
      error: 'Storage API is not supported in this environment.',
    };
  }

  try {
    let persisted = false;
    if (navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }

    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }

    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;
    let availableBytes: number | undefined;
    let usagePercent: number | undefined;

    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
      if (quotaBytes && usageBytes !== undefined) {
        availableBytes = Math.max(0, quotaBytes - usageBytes);
        usagePercent = Number(((usageBytes / quotaBytes) * 100).toFixed(2));
      }
    }

    return {
      persisted,
      supported: true,
      quotaBytes,
      usageBytes,
      availableBytes,
      usagePercent,
    };
  } catch (err: unknown) {
    return {
      persisted: false,
      supported: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * React hook to observe and interact with storage persistence status
 */
export function useStoragePersistence() {
  const [status, setStatus] = useState<PersistenceInfo>({
    persisted: false,
    supported: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const info = await ensurePersistentStorage();
    setStatus(info);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}

/**
 * Formats byte values into human-readable strings (e.g., "14.2 MB", "2.1 GB")
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || isNaN(bytes)) return 'Unknown';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
