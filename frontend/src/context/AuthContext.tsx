// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native'; // Add this
import { Alert } from 'react-native';
import API from '../api'; 
interface User {
  id: number;
  username: string;
  role: string;
  fullName?: string;
  email?: string;
  shopName?: string;
   upiId?: string | null;
   clientId?: string | number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
  try {
    // ✅ ALWAYS clear storage on app start
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('loginTime');
    
    console.log('🧹 Storage cleared - always show login screen');
    setUser(null);
    
  } catch (error) {
    
  } finally {
    setIsLoading(false);
  }
};

  // In AuthContext.tsx - When user logs in
// src/context/AuthContext.tsx

// src/context/AuthContext.tsx

// frontend/src/context/AuthContext.tsx

// frontend/src/context/AuthContext.tsx

const login = async (username: string, password: string): Promise<boolean> => {
  try {
    console.log('📝 Attempting login with:', username);
    
    const response = await API.post('/auth/login', {
      username,
      password
    });

    console.log('✅ Login response:', response.data);
    
    if (!response.data) return false;
    if (!response.data.token) {
      console.log('❌ No token in response');
      return false;
    }

    const userData = {
      ...response.data.user,
      clientId: response.data.user?.client_id || response.data.user?.clientId || response.data.user?.id,
      shopName: response.data.user?.shopName
    };

    // ✅ CRITICAL: Save token and verify immediately
    console.log('💾 Saving token to AsyncStorage...');
    await AsyncStorage.setItem('token', response.data.token);
    
    // ✅ Verify token was saved
    const savedToken = await AsyncStorage.getItem('token');
    console.log('✅ Token saved:', savedToken ? 'Success' : 'Failed');
    console.log('📝 Saved token preview:', savedToken?.substring(0, 20) + '...');
    
    if (!savedToken) {
      console.log('❌ Token not saved! AsyncStorage issue?');
      return false;
    }
    
    // ✅ Save user data
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    // ✅ Set user state
    setUser(userData);
    
    // ✅ Test immediate API call
    try {
      const testResponse = await API.get('/license/status');
      console.log('✅ Test API call after login:', testResponse.data);
    } catch (testError) {
      console.log('❌ Test API call failed:', testError);
    }
    
    return true;
    
  } catch (error: any) {
    console.log('❌ Login error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.data?.code === 'ACCOUNT_BLOCKED') {
      Alert.alert('Account Blocked', 'Your account has been blocked by administrator.');
    } 
    else if (error.response?.data?.code === 'LICENSE_EXPIRED') {
      Alert.alert('License Expired', 'Your license has expired.');
    }
    else {
      Alert.alert('Login Failed', 'Invalid username or password');
    }
    
    return false;
  }
};
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      console.log('✅ Logged out');
    } catch (error) {
      
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};