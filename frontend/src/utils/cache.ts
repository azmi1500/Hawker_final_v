// src/utils/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cache = {
  async get(key: string) {
    try {
      const item = await AsyncStorage.getItem(key);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > CACHE_DURATION) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  },
  
  async set(key: string, data: any) {
    try {
      const item = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      await AsyncStorage.setItem(key, item);
    } catch (error) {
      console.log('Cache set error:', error);
    }
  }
};