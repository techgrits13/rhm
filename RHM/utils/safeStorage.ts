import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Safely get and parse JSON from AsyncStorage
 * Returns fallback value if storage is corrupted or missing
 * 
 * @param key Storage key to retrieve
 * @param fallback Default value if key doesn't exist or parse fails
 * @returns Parsed value or fallback
 */
export async function safeGetJson<T>(key: string, fallback: T): Promise<T> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (raw === null) {
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn(`[safeStorage] Corrupted data for key "${key}", resetting to fallback:`, error);
        // Clean up corrupted data to prevent future crashes
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            // Ignore cleanup errors
        }
        return fallback;
    }
}

/**
 * Safely set JSON to AsyncStorage
 * Silently logs errors instead of crashing
 * 
 * @param key Storage key
 * @param value Value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 */
export async function safeSetJson<T>(key: string, value: T): Promise<boolean> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[safeStorage] Failed to save key "${key}":`, error);
        return false;
    }
}
