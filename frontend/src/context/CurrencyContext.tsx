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
  
  // ✅ NEW: Track loaded state to prevent duplicates
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);
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
          loadedRef.current = false; // Reset for new user
          setIsLoading(true);
          await loadCurrencyFromSettings();
          setIsLoading(false);
        } else {
          // Same user - skip if already loaded
          if (loadedRef.current) {
            console.log('⏭️ Currency already loaded for this user, skipping...');
          }
        }
      } else {
        // No user - reset to defaults
        setCurrencyCode('SGD');
        setCurrencySymbol('$');
        currentUserIdRef.current = null;
        loadedRef.current = false;
      }
    };

    loadUserCurrency();
  }, [user?.id]);

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

    // ✅ CRITICAL: Skip if already loaded
    if (loadedRef.current) {
      console.log('⏭️ Currency already loaded, skipping...');
      return;
    }

    // ✅ Skip if already loading
    if (loadingRef.current) {
      console.log('⏳ Currency already loading, skipping...');
      return;
    }

    loadingRef.current = true;
    console.log(`🔄 Loading currency for user ${user.id}...`);
    
    try {
      // Increase timeout to 10 seconds
      const response = await API.get(`/company-settings/${user.id}`, {
        timeout: 10000 // 10 seconds
      });
      
      if (response.data.success) {
        const settings = response.data.settings;
        const newCode = settings.Currency || settings.currency || 'SGD';
        const newSymbol = settings.CurrencySymbol || settings.currencySymbol || '$';
        
        console.log(`✅ Loaded currency: ${newCode} (${newSymbol})`);
        
        setCurrencyCode(newCode);
        setCurrencySymbol(newSymbol);
        
        // ✅ Mark as loaded
        loadedRef.current = true;
        
        await AsyncStorage.setItem(`currencyCode_${user.id}`, newCode);
        await AsyncStorage.setItem(`currencySymbol_${user.id}`, newSymbol);
      }
    } catch (error: any) {
      console.log('❌ Currency load error');
      
      // Retry logic for network errors
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        if (retryCount < 3) {
          console.log(`🔄 Retrying... attempt ${retryCount + 1}/3`);
          setTimeout(() => {
            loadingRef.current = false; // Reset loading flag for retry
            loadCurrencyFromSettings(retryCount + 1);
          }, 2000 * (retryCount + 1));
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
          loadedRef.current = true; // Mark as loaded even from cache
        } else {
          console.log('⚠️ Using default currency');
        }
      } catch (e) {
        // Keep defaults
      }
    } finally {
      loadingRef.current = false;
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
    loadedRef.current = false; // Force reload
    loadingRef.current = false; // Reset loading flag
    await loadCurrencyFromSettings(0);
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