// frontend/src/context/CurrencyContext.tsx

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api';
import { useAuth } from './AuthContext';

interface CurrencySettings {
  currencyCode: string;
  currencySymbol: string;
}

interface CurrencyContextType {
  currencyCode: string;
  currencySymbol: string;
  formatPrice: (amount: number) => string;
  setCurrency: (code: string, symbol: string) => Promise<void>;
  loadCurrencyFromSettings: () => Promise<void>;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [currencyCode, setCurrencyCode] = useState('SGD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [isLoading, setIsLoading] = useState(true);
  
  // Track current user to detect changes
  const currentUserIdRef = useRef<string | number | null>(null);

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadSavedCurrency();
  }, []);

  // Load from API when user changes
  useEffect(() => {
    const loadUserCurrency = async () => {
      if (user?.id) {
        // Check if user actually changed
        if (currentUserIdRef.current !== user.id) {
          console.log(`👤 User changed from ${currentUserIdRef.current} to ${user.id}, loading currency...`);
          currentUserIdRef.current = user.id;
          setIsLoading(true);
          await loadCurrencyFromSettings();
          setIsLoading(false);
        }
      } else {
        // No user - reset to defaults
        setCurrencyCode('SGD');
        setCurrencySymbol('$');
        currentUserIdRef.current = null;
      }
    };

    loadUserCurrency();
  }, [user?.id]); // ✅ Only depend on user.id

  const loadSavedCurrency = async () => {
    try {
      const savedCode = await AsyncStorage.getItem('currencyCode');
      const savedSymbol = await AsyncStorage.getItem('currencySymbol');
      
      if (savedCode && savedSymbol) {
        // Only set if no user or as fallback
        if (!user?.id) {
          setCurrencyCode(savedCode);
          setCurrencySymbol(savedSymbol);
        }
      }
    } catch (error) {
      console.log('Error loading saved currency:', error);
    }
  };

 const loadCurrencyFromSettings = async (retryCount = 0) => {
  if (!user?.id) {
    console.log('⚠️ No user ID, using defaults');
    return;
  }

  console.log(`🔄 Loading currency for user ${user.id}...`);
  
  try {
    // ✅ Add timeout and better error handling
    const response = await API.get(`/company-settings/${user.id}`, {
      timeout: 4000 // 10 second timeout
    });
    
    if (response.data.success) {
      const settings = response.data.settings;
      const newCode = settings.Currency || settings.currency || 'SGD';
      const newSymbol = settings.CurrencySymbol || settings.currencySymbol || '$';
      
      console.log(`✅ Loaded currency: ${newCode} (${newSymbol})`);
      
      setCurrencyCode(newCode);
      setCurrencySymbol(newSymbol);
      
      await AsyncStorage.setItem(`currencyCode_${user.id}`, newCode);
      await AsyncStorage.setItem(`currencySymbol_${user.id}`, newSymbol);
    }
  } catch (error: any) {
    // ✅ Detailed error logging
    console.log('❌ Currency load error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // ✅ Retry logic for network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      if (retryCount < 3) {
        console.log(`🔄 Retrying... attempt ${retryCount + 1}/3`);
        setTimeout(() => {
          loadCurrencyFromSettings(retryCount + 1);
        }, 2000 * (retryCount + 1)); // 2s, 4s, 6s delay
        return;
      }
    }
    
    // Fallback to saved currency
    try {
      const savedCode = await AsyncStorage.getItem(`currencyCode_${user.id}`);
      const savedSymbol = await AsyncStorage.getItem(`currencySymbol_${user.id}`);
      
      if (savedCode && savedSymbol) {
        setCurrencyCode(savedCode);
        setCurrencySymbol(savedSymbol);
        console.log('✅ Using saved currency from storage');
      } else {
        // Keep defaults
        console.log('⚠️ Using default currency');
      }
    } catch (e) {
      // Keep defaults
    }
  }
};

  const formatPrice = useCallback((amount: number): string => {
    if (amount === undefined || amount === null) return `${currencySymbol}0.00`;
    return `${currencySymbol}${amount.toFixed(2)}`;
  }, [currencySymbol]);

  const setCurrency = async (code: string, symbol: string) => {
    console.log(`💰 Setting currency to ${code} (${symbol})`);
    
    setCurrencyCode(code);
    setCurrencySymbol(symbol);
    
    // Save with user prefix if logged in
    if (user?.id) {
      await AsyncStorage.setItem(`currencyCode_${user.id}`, code);
      await AsyncStorage.setItem(`currencySymbol_${user.id}`, symbol);
    } else {
      await AsyncStorage.setItem('currencyCode', code);
      await AsyncStorage.setItem('currencySymbol', symbol);
    }
  };

  const refreshCurrency = async () => {
    console.log('🔄 Refreshing currency...');
    await loadCurrencyFromSettings();
  };

  return (
    <CurrencyContext.Provider value={{ 
      currencyCode, 
      currencySymbol, 
      formatPrice, 
      setCurrency,
      loadCurrencyFromSettings,
      refreshCurrency
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};
