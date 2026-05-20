import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN:    'auth_token',
  USER_ID:  'user_id',
  IS_ADMIN: 'is_admin',
};

/**
 * In-memory cache for the auth token.
 *
 * AsyncStorage writes are async — there's a window between when saveAuth()
 * is called and when getItem() would return the new value. Without this cache,
 * any screen that navigates immediately after login/passcode-verify and calls
 * an API in its first render gets null from getToken() and sends an
 * unauthenticated request.
 *
 * The cache is set synchronously inside saveAuth() before the awaited writes,
 * so getToken() returns the correct value instantly on the very next tick.
 */
let _tokenCache: string | null = null;

export const Storage = {

  saveAuth: async (
    token:   string,
    userId:  number,
    isAdmin: boolean,
  ): Promise<void> => {
    // Set cache synchronously — callers can read the token immediately after
    _tokenCache = token;

    // Persist to storage in parallel
    await Promise.all([
      AsyncStorage.setItem(KEYS.TOKEN,    token),
      AsyncStorage.setItem(KEYS.USER_ID,  String(userId)),
      AsyncStorage.setItem(KEYS.IS_ADMIN, String(isAdmin)),
    ]);
  },

  getToken: async (): Promise<string | null> => {
    // Return from cache if available — avoids AsyncStorage round-trip
    if (_tokenCache !== null) return _tokenCache;
    const token = await AsyncStorage.getItem(KEYS.TOKEN);
    if (token) _tokenCache = token; // warm the cache on first read
    return token;
  },

  getUserId: async (): Promise<number | null> => {
    const val = await AsyncStorage.getItem(KEYS.USER_ID);
    return val ? parseInt(val, 10) : null;
  },

  getIsAdmin: async (): Promise<boolean> => {
    const val = await AsyncStorage.getItem(KEYS.IS_ADMIN);
    return val === 'true';
  },

  clear: async (): Promise<void> => {
    // Clear cache synchronously first so no stale token leaks after logout
    _tokenCache = null;

    await Promise.all([
      AsyncStorage.removeItem(KEYS.TOKEN),
      AsyncStorage.removeItem(KEYS.USER_ID),
      AsyncStorage.removeItem(KEYS.IS_ADMIN),
    ]);
  },
};