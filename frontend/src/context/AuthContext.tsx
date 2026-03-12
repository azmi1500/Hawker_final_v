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

const login = async (username: string, password: string): Promise<boolean> => {
  try {
    const response = await API.post('/auth/login', {
      username,
      password
    });

    console.log('✅ Login response:', response.data);
    
    if (!response.data) return false;

    const userData = {
      ...response.data.user,
      clientId: response.data.user?.client_id || response.data.user?.clientId || response.data.user?.id,
      shopName: response.data.user?.shopName
    };

    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    return true;
    
  } catch (error: any) {
    
    
    // ✅ Different messages for different cases
    if (error.response?.data?.code === 'ACCOUNT_BLOCKED') {
      Alert.alert(
        'Account Blocked',
        'Your account has been blocked by administrator. Please contact your admin.'
      );
    } 
    else if (error.response?.data?.code === 'LICENSE_EXPIRED') {
      Alert.alert(
        'License Expired',
        'Your license has expired. Please contact your administrator.'
      );
    }
    else {
      // Invalid credentials
      Alert.alert(
        'Login Failed',
        'Invalid username or password'
      );
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