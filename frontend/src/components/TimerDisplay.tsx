// components/TimerDisplay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import API from '../api';

// ✅ This runs completely independently!
const TimerDisplay: React.FC<{ theme: any; t: any }> = ({ theme, t }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const expiryRef = useRef<string | null>(null);

  useEffect(() => {
    // Load license once
    API.get('/license/status').then(response => {
      if (response.data?.ExpiryDate) {
        expiryRef.current = response.data.ExpiryDate;
      }
    });

    // Update timer every second - NO STATE CHANGE in parent!
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
  }, []); // ✅ Empty deps - runs once

  return (
    <View style={[styles.countdownBox, { backgroundColor: theme.surface }]}>
      <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
        ⏱️ {t?.timeLeft || 'Time Left'}:
      </Text>
      <Text style={[styles.countdownTimer, { color: theme.primary }]}>
        {String(timeLeft.days).padStart(2, '0')}d :{' '}
        {String(timeLeft.hours).padStart(2, '0')}h :{' '}
        {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
        {String(timeLeft.seconds).padStart(2, '0')}s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  countdownBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  countdownLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  countdownTimer: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default React.memo(TimerDisplay); // ✅ Memoized - won't re-render