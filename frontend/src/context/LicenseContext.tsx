// context/LicenseContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import API from '../api';

interface LicenseContextType {
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
}

const LicenseContext = createContext<LicenseContextType>({
  timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 }
});

export const useLicense = () => useContext(LicenseContext);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const expiryRef = useRef<string | null>(null);

  useEffect(() => {
    // Load license
    API.get('/license/status').then(response => {
      if (response.data?.ExpiryDate) {
        expiryRef.current = response.data.ExpiryDate;
      }
    });

    // Update timer
    const timer = setInterval(() => {
      if (expiryRef.current) {
        const expiry = new Date(expiryRef.current);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();

        if (diff > 0) {
          setTimeLeft({
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60)
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <LicenseContext.Provider value={{ timeLeft }}>
      {children}
    </LicenseContext.Provider>
  );
};