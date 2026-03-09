// frontend/src/api.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';  // ✅ Add Alert

// We'll use this to navigate
let navigateToLogin = null;

export const setNavigationCallback = (callback) => {
  navigateToLogin = callback;
};

const getBaseURL = () => {
  if (__DEV__) {
    // ✅ Development - use Railway itself (since it's hosted!)
   return 'https://hawkerfinalv-production.up.railway.app/api';

  } else {
    // Production - same URL
   return 'https://hawkerfinalv-production.up.railway.app/api';

  }
};

const BASE_URL = getBaseURL();
console.log('📱 Platform:', Platform.OS);
console.log('🌐 API Base URL:', BASE_URL);
console.log('🚀 Environment:', __DEV__ ? 'Development' : 'Production');

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

// Add token to every request
// frontend/src/api.ts

// frontend/src/api.ts

API.interceptors.request.use(
  async (config) => {
    // ✅ Get token from storage
    const token = await AsyncStorage.getItem('token');
    
    // ✅ Detailed logging
    console.log('🔑 Interceptor triggered for:', config.url);
    console.log('🔑 Token in storage:', token ? 'Yes' : 'No');
    
    if (token) {
      // ✅ Log token preview
      console.log('📝 Token preview:', token.substring(0, 20) + '...');
      console.log('📝 Token length:', token.length);
      
      // ✅ Set authorization header
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header set');
    } else {
      console.log('❌ No token found for request');
    }
    
    console.log('➡️ Request:', config.method.toUpperCase(), config.url);
    console.log('📤 Headers:', JSON.stringify(config.headers, null, 2));
    
    return config;
  },
  (error) => {
    console.log('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);
// Handle response errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Technical log (only you see)
    console.log('🔴 API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // ✅ Check for forceLogout (account blocked)
    if (error.response?.data?.forceLogout) {
      // Show alert and force logout
      Alert.alert(
        'Account Blocked',
        error.response.data.message || 'Your account has been blocked by administrator.',
        [
          {
            text: 'OK',
            onPress: async () => {
              console.log('🚪 Logging out due to account block');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              if (navigateToLogin) {
                navigateToLogin();
              }
            }
          }
        ],
        { cancelable: false }  // ✅ Add this - prevents tapping outside
      );
      
      error.userMessage = error.response.data.message || 'Account blocked';
      return Promise.reject(error);
    }

    // Create user-friendly error message for other errors
    let userMessage = 'Something went wrong. Please try again.';
    
    if (!error.response) {
      // Network error
      userMessage = 'Network error. Please check your internet connection.';
    } else {
      // Server responded with error
      switch (error.response.status) {
        case 400:
          userMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          userMessage = 'Session expired. Please login again.';
          // Clear storage and redirect to login
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          if (navigateToLogin) {
            navigateToLogin();
          }
          break;
        case 403:
          // Check if it's license expired
          if (error.response.data?.code === 'LICENSE_EXPIRED') {
            userMessage = error.response.data.message || 'License expired';
          } else {
            userMessage = 'You don\'t have permission to do this.';
          }
          break;
        case 404:
          userMessage = 'Service not available.';
          break;
        case 500:
          userMessage = 'Server error. Please try later.';
          break;
        default:
          userMessage = 'Something went wrong. Please try again.';
      }
    }

    // Attach user-friendly message to error
    error.userMessage = userMessage;
    
    return Promise.reject(error);
  }
);

// For file uploads
export const uploadAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

uploadAPI.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

uploadAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ✅ Same forceLogout handling for uploads
    if (error.response?.data?.forceLogout) {
      Alert.alert(
        'Account Blocked',
        error.response.data.message || 'Your account has been blocked by administrator.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              if (navigateToLogin) navigateToLogin();
            }
          }
        ]
      );
      error.userMessage = error.response.data.message || 'Account blocked';
      return Promise.reject(error);
    }

    let userMessage = 'Upload failed. Please try again.';
    
    if (!error.response) {
      userMessage = 'Network error. Check your connection.';
    } else {
      switch (error.response.status) {
        case 401:
          userMessage = 'Session expired. Please login again.';
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          if (navigateToLogin) navigateToLogin();
          break;
        case 413:
          userMessage = 'File too large. Max 5MB allowed.';
          break;
        default:
          userMessage = 'Upload failed. Please try again.';
      }
    }
    
    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export default API;