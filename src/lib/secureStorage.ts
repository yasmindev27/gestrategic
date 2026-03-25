/**
 * Secure Storage for Sensitive Data (PII)
 * 
 * Strategy:
 * - Sensitive data (CPF, Email, Phone) → sessionStorage (cleared on browser close)
 * - Non-sensitive data → localStorage (persisted)
 * - Future: Add client-side encryption with crypto-js if needed
 * 
 * NEVER expose PII in localStorage or logs!
 */

const SENSITIVE_KEYS = [
  'cpf',
  'cnpj',
  'email',
  'phone',
  'password',
  'medicalRecords',
  'prescription',
  'patient',
  'medication',
  'healthcare',
];

export class SecureStorage {
  /**
   * Check if a key contains sensitive data
   */
  private static isSensitive(key: string): boolean {
    return SENSITIVE_KEYS.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  /**
   * Set item - automatically routes to correct storage based on sensitivity
   */
  static setItem(key: string, value: string): void {
    try {
      const isSensitive = this.isSensitive(key);
      const storage = isSensitive ? sessionStorage : localStorage;

      storage.setItem(key, value);

      // Log only key name, never the value
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[SecureStorage] Stored ${isSensitive ? 'SENSITIVE' : 'public'} key: "${key}"`
        );
      }
    } catch (error) {
      console.error('[SecureStorage] Failed to set item:', error);
    }
  }

  /**
   * Get item from correct storage based on sensitivity
   */
  static getItem(key: string): string | null {
    try {
      const isSensitive = this.isSensitive(key);
      const storage = isSensitive ? sessionStorage : localStorage;
      return storage.getItem(key);
    } catch (error) {
      console.error('[SecureStorage] Failed to get item:', error);
      return null;
    }
  }

  /**
   * Remove item from both storages
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('[SecureStorage] Failed to remove item:', error);
    }
  }

  /**
   * Clear all sensitive data (used on logout)
   */
  static clearSensitive(): void {
    try {
      // Clear all sessionStorage
      sessionStorage.clear();
      console.log('[SecureStorage] Cleared all sensitive data from sessionStorage');
    } catch (error) {
      console.error('[SecureStorage] Failed to clear sensitive data:', error);
    }
  }

  /**
   * Clear all data (used on logout)
   */
  static clearAll(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('[SecureStorage] Cleared all storage');
    } catch (error) {
      console.error('[SecureStorage] Failed to clear storage:', error);
    }
  }

  /**
   * Get parsed JSON from storage
   */
  static getJSON<T = any>(key: string, defaultValue?: T): T | null {
    try {
      const item = this.getItem(key);
      if (!item) return defaultValue ?? null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error('[SecureStorage] Failed to parse JSON:', error);
      return defaultValue ?? null;
    }
  }

  /**
   * Set JSON to storage
   */
  static setJSON(key: string, value: any): void {
    try {
      const jsonString = JSON.stringify(value);
      this.setItem(key, jsonString);
    } catch (error) {
      console.error('[SecureStorage] Failed to stringify JSON:', error);
    }
  }
}

/**
 * Legacy compatibility layer - replace localStorage with SecureStorage
 * Usage: Replace `localStorage.setItem()` with `SecureStorage.setItem()`
 */
export const legacyStorageMigration = {
  /**
   * Scan for unsafe localStorage usage in development
   */
  auditUsage(): void {
    if (process.env.NODE_ENV === 'production') return;

    const unsafeKeys = Object.keys(localStorage).filter((key) =>
      this.isSensitive(key)
    );

    if (unsafeKeys.length > 0) {
      console.warn(
        '[SecureStorage] Found sensitive data in localStorage:',
        unsafeKeys
      );
      console.warn(
        '[SecureStorage] Migrate to SecureStorage.setItem() to use sessionStorage instead'
      );
    }
  },

  isSensitive(key: string): boolean {
    return SENSITIVE_KEYS.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  },
};
