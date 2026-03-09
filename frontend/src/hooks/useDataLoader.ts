// Create a new file: src/hooks/useDataLoader.ts

import { useState, useEffect, useRef } from 'react';
import API from '../api';

export const useDataLoader = (userId: number) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);
  
  const [data, setData] = useState({
    dishGroups: [],
    dishItems: [],
    paymentModes: [],
    upiId: '',
    payNowQr: '',
    currency: { code: 'SGD', symbol: '$' }
  });

  useEffect(() => {
    if (!userId || loadedRef.current) return;
    
    const loadAllData = async () => {
      console.log('🚀 Loading ALL data once for user:', userId);
      setLoading(true);
      
      try {
        // Load everything in PARALLEL (much faster!)
        const [
          groupsRes,
          itemsRes,
          paymentModesRes,
          upiRes,
          paynowRes,
          settingsRes
        ] = await Promise.all([
          API.get('/dishgroups'),
          API.get('/dishitems'),
          API.get(`/user/payment-modes/${userId}`),
          API.get(`/user/upi/${userId}`),
          API.get(`/user/paynow/${userId}`),
          API.get(`/company-settings/${userId}`)
        ]);

        setData({
          dishGroups: groupsRes.data,
          dishItems: itemsRes.data,
          paymentModes: paymentModesRes.data.paymentModes || [],
          upiId: upiRes.data.upiId || '',
          payNowQr: paynowRes.data.qrCodeUrl || '',
          currency: {
            code: settingsRes.data.settings?.CurrencyCode || 'SGD',
            symbol: settingsRes.data.settings?.CurrencySymbol || '$'
          }
        });

        loadedRef.current = true;
        console.log('✅ All data loaded in parallel!');
        
      } catch (err) {
        setError(err);
        console.log('❌ Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [userId]);

  return { ...data, loading, error };
};