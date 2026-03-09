// hooks/useLicenseTimer.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  text: string;
  class?: string;
}

export const useLicenseTimer = () => {
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0,
    text: 'Loading...'
  });
  const [isVisible, setIsVisible] = useState(true);
  
  const expiryRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const calculateTimeLeft = useCallback(() => {
    if (!expiryRef.current) {
      setTimeLeft(prev => ({ ...prev, text: 'No License' }));
      return;
    }

    try {
      // ✅ DIRECT DATE CONSTRUCTION - NO STRING PARSING!
      const expiryStr = expiryRef.current;
      
      // Extract numbers directly
      const year = parseInt(expiryStr.substring(0, 4));
      const month = parseInt(expiryStr.substring(5, 7)) - 1; // JS months are 0-based
      const day = parseInt(expiryStr.substring(8, 10));
      const hours = parseInt(expiryStr.substring(11, 13));
      const minutes = parseInt(expiryStr.substring(14, 16));
      
      // Create date directly with numbers
      const expiryDate = new Date(year, month, day, hours, minutes, 0);
      const now = new Date();
      
      const diffMs = expiryDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      console.log('⏱️ DEBUG:', {
        original: expiryStr,
        year, month: month+1, day, hours, minutes,
        expiryDate: expiryDate.toString(),
        now: now.toString(),
        diffMins
      });

      if (diffMins < 0 || isNaN(diffMins)) {
        setTimeLeft({ 
          days: 0, 
          hours: 0, 
          minutes: 0, 
          seconds: 0, 
          text: 'Expired',
          class: 'status-expired'
        });
        return;
      }
      
      let text = '';
      let statusClass = '';
      
      if (diffMins < 60) {
        text = `${diffMins} minutes`;
        statusClass = 'status-warning';
      } else if (diffMins < 1440) {
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        text = `${h}h ${m}m`;
        statusClass = 'status-warning';
      } else {
        const d = Math.floor(diffMins / 1440);
        const h = Math.floor((diffMins % 1440) / 60);
        text = `${d}d ${h}h`;
        statusClass = d < 7 ? 'status-warning' : 'status-active';
      }

      const days = Math.floor(diffMins / 1440);
      const hoursLeft = Math.floor((diffMins % 1440) / 60);
      const minsLeft = diffMins % 60;
      const secsLeft = Math.floor((diffMs % (1000 * 60)) / 1000);

      const newTimeLeft = { 
        days, 
        hours: hoursLeft, 
        minutes: minsLeft, 
        seconds: secsLeft,
        text,
        class: statusClass
      };
      
      console.log('✅ TimeLeft:', newTimeLeft);
      setTimeLeft(newTimeLeft);
      
    } catch (error) {
      console.log('❌ Timer error:', error);
      setTimeLeft(prev => ({ ...prev, text: 'Error' }));
    }
  }, []);

  const loadLicense = useCallback(async () => {
    try {
      const response = await API.get('/license/status');
      
      const expiryDate = response.data?.ExpiryDate;
      
      if (expiryDate) {
        console.log('📦 Raw IST from DB:', expiryDate);
        expiryRef.current = expiryDate;
        setLicenseInfo(response.data);
        calculateTimeLeft();
      }
    } catch (error) {
      console.log('❌ License load error:', error);
    }
  }, [calculateTimeLeft]);

  useEffect(() => {
    loadLicense();
    timerRef.current = setInterval(calculateTimeLeft, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    licenseInfo,
    timeLeft,
    setIsVisible,
    refreshLicense: loadLicense
  };
};