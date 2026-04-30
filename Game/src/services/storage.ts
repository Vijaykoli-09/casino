import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN:    'auth_token',
  USER_ID:  'user_id',
  IS_ADMIN: 'is_admin',
};

export const Storage = {
  saveAuth: async (token: string, userId: number, isAdmin: boolean): Promise<void> => {
    await AsyncStorage.setItem(KEYS.TOKEN,    token);
    await AsyncStorage.setItem(KEYS.USER_ID,  String(userId));
    await AsyncStorage.setItem(KEYS.IS_ADMIN, String(isAdmin));
  },

  getToken: (): Promise<string | null> =>
    AsyncStorage.getItem(KEYS.TOKEN),

  getUserId: async (): Promise<number | null> => {
    const val = await AsyncStorage.getItem(KEYS.USER_ID);
    return val ? parseInt(val, 10) : null;
  },

  getIsAdmin: async (): Promise<boolean> => {
    const val = await AsyncStorage.getItem(KEYS.IS_ADMIN);
    return val === 'true';
  },

  clear: async (): Promise<void> => {
    await AsyncStorage.removeItem(KEYS.TOKEN);
    await AsyncStorage.removeItem(KEYS.USER_ID);
    await AsyncStorage.removeItem(KEYS.IS_ADMIN);
  },
};