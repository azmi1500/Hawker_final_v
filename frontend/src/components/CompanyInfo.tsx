// src/components/CompanyInfo.tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface CompanyInfoProps {
  shopName: string;
  licenseKey: string;
  expiryDate: string;
  timeLeft: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  theme: any;
  t: any;
}

export const CompanyInfo: React.FC<CompanyInfoProps> = ({
  shopName,
  licenseKey,
  expiryDate,
  timeLeft,
  theme,
  t
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (timeLeft.days < 1 && timeLeft.hours < 1) return theme.danger;
    if (timeLeft.days < 7) return theme.warning;
    return theme.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Company Logo & Name */}
      <View style={styles.logoContainer}>
        <View style={[styles.logo, { backgroundColor: theme.primary }]}>
          <Text style={styles.logoText}>🏢</Text>
        </View>
        <View style={styles.companyInfo}>
          <Text style={[styles.shopName, { color: theme.text }]}>{shopName || 'POS System'}</Text>
          <Text style={[styles.licenseLabel, { color: theme.textSecondary }]}>{t.licenseKey}:</Text>
          <Text style={[styles.licenseKey, { color: theme.primary }]}>{licenseKey || 'N/A'}</Text>
        </View>
      </View>

      {/* Expiry Info */}
      <View style={styles.expiryContainer}>
        <Text style={[styles.expiryLabel, { color: theme.textSecondary }]}>{t.expiresOn}:</Text>
        <Text style={[styles.expiryDate, { color: theme.text }]}>{formatDate(expiryDate)}</Text>
        
        {/* Countdown Timer */}
        <View style={[styles.countdownContainer, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>{t.timeLeft}:</Text>
          <View style={styles.countdownNumbers}>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownValue, { color: getStatusColor() }]}>
                {String(timeLeft.days).padStart(2, '0')}
              </Text>
              <Text style={[styles.countdownUnit, { color: theme.textSecondary }]}>{t.days}</Text>
            </View>
            <Text style={[styles.countdownSeparator, { color: getStatusColor() }]}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownValue, { color: getStatusColor() }]}>
                {String(timeLeft.hours).padStart(2, '0')}
              </Text>
              <Text style={[styles.countdownUnit, { color: theme.textSecondary }]}>{t.hours}</Text>
            </View>
            <Text style={[styles.countdownSeparator, { color: getStatusColor() }]}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownValue, { color: getStatusColor() }]}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </Text>
              <Text style={[styles.countdownUnit, { color: theme.textSecondary }]}>{t.minutes}</Text>
            </View>
            <Text style={[styles.countdownSeparator, { color: getStatusColor() }]}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownValue, { color: getStatusColor() }]}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </Text>
              <Text style={[styles.countdownUnit, { color: theme.textSecondary }]}>{t.seconds}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
  },
  companyInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  licenseLabel: {
    fontSize: 12,
  },
  licenseKey: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryContainer: {
    marginTop: 8,
  },
  expiryLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  countdownContainer: {
    padding: 12,
    borderRadius: 8,
  },
  countdownLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  countdownNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  countdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  countdownValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  countdownUnit: {
    fontSize: 10,
    marginTop: 2,
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 2,
  },
});