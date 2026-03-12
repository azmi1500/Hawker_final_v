// src/utils/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async saveCredentials(username: string, password: string, remember: boolean) {
    try {
      if (remember) {
        await SecureStore.setItemAsync('username', username);
        await SecureStore.setItemAsync('password', password);
        await SecureStore.setItemAsync('remember_me', 'true');
      } else {
        await SecureStore.deleteItemAsync('username');
        await SecureStore.deleteItemAsync('password');
        await SecureStore.setItemAsync('remember_me', 'false');
      }
      return true;
    } catch (error) {
      console.log('❌ Secure save error:', error);
      return false;
    }
  },

  async loadCredentials() {
    try {
      const username = await SecureStore.getItemAsync('username');
      const password = await SecureStore.getItemAsync('password');
      const remember = await SecureStore.getItemAsync('remember_me');
      
      return {
        username: username || '',
        password: password || '',
        rememberMe: remember === 'true'
      };
    } catch (error) {
      console.log('❌ Secure load error:', error);
      return { username: '', password: '', rememberMe: false };
    }
  },

  async clearCredentials() {
    await SecureStore.deleteItemAsync('username');
    await SecureStore.deleteItemAsync('password');
    await SecureStore.setItemAsync('remember_me', 'false');
  }
};