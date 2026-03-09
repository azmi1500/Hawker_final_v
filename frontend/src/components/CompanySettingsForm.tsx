// components/CompanySettingsForm.tsx - UPDATED with Currency Context

import React, { useState, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BillPDFGenerator from './BillPDFGenerator';
import { useCurrency } from '../context/CurrencyContext';  // ✅ Add this import

interface CompanySettings {
  name: string;
  address: string;
  gstNo: string;
  gstPercentage: number;
  phone: string;
  email: string;
  cashierName: string;
  currency: string;
  currencySymbol: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (settings: CompanySettings) => void;
  theme: any;
  t: any;
  clientId?: string | number;
  userShopName?: string;
  defaultCashier?: string;
}

const CompanySettingsForm: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  theme,
  t,
  clientId,
  userShopName,
  defaultCashier
}) => {
  // ✅ Add currency context
  const { refreshCurrency } = useCurrency();
  
  const [settings, setSettings] = useState<CompanySettings>({
    name: userShopName || '',
    address: '',
    gstNo: '',
    gstPercentage: 9,
    phone: '',
    email: '',
    cashierName: defaultCashier || '',
    currency: 'SGD',
    currencySymbol: '$',
  });
  
  const [enableGST, setEnableGST] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadClientSettings();
    }
  }, [visible, clientId]);

  useEffect(() => {
    if (defaultCashier) {
      setSettings(prev => ({ ...prev, cashierName: defaultCashier }));
    }
  }, [defaultCashier]);

  useEffect(() => {
    if (userShopName) {
      setSettings(prev => ({ ...prev, name: userShopName }));
    }
  }, [userShopName]);

  const loadClientSettings = async () => {
    try {
      if (clientId) {
        const savedSettings = await BillPDFGenerator.loadSettings(clientId);
        setSettings({
          name: userShopName || savedSettings.name || '',
          address: savedSettings.address || '',
          gstNo: savedSettings.gstNo || '',
          gstPercentage: savedSettings.gstPercentage || 9,
          phone: savedSettings.phone || '',
          email: savedSettings.email || '',
          cashierName: savedSettings.cashierName || defaultCashier || '',
          currency: savedSettings.currency || 'SGD',
          currencySymbol: savedSettings.currencySymbol || '$',
        });
        setEnableGST(savedSettings.gstPercentage > 0);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!settings.name.trim()) {
      Alert.alert(t.error, 'Shop name is required for bill receipt');
      return;
    }

    const finalSettings = {
      ...settings,
      gstPercentage: enableGST ? settings.gstPercentage : 0
    };

    setSaving(true);
    
    try {
      const success = await BillPDFGenerator.saveSettings(finalSettings, clientId);
      
      if (success) {
        // ✅ Refresh currency in all components!
        await refreshCurrency();
        
        onSave(finalSettings);
        Alert.alert(t.success, 'Settings saved successfully');
        onClose();
      } else {
        Alert.alert(t.error, 'Failed to save settings');
      }
    } catch (error) {
      Alert.alert(t.error, 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Add currency options for quick selection
  const currencyOptions = [
    { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Bill Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* Shop Name - READONLY */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Shop Name (from Admin) *
            </Text>
            <View style={[styles.readonlyField, { 
              backgroundColor: theme.surface + '80',
              borderColor: theme.border
            }]}>
              <Text style={[styles.readonlyText, { color: theme.text }]}>
                {settings.name || 'Not set'}
              </Text>
            </View>

            {/* Address */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.address}
              onChangeText={(text) => setSettings({...settings, address: text})}
              placeholder="Enter address"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              editable={!saving}
            />

            {/* Currency Quick Selection */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Quick Currency Select
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
              {currencyOptions.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyChip,
                    { 
                      backgroundColor: settings.currency === curr.code ? theme.primary : theme.surface,
                      borderColor: settings.currency === curr.code ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => setSettings({
                    ...settings,
                    currency: curr.code,
                    currencySymbol: curr.symbol
                  })}
                >
                  <Text style={[
                    styles.currencyChipText,
                    { color: settings.currency === curr.code ? '#fff' : theme.text }
                  ]}>
                    {curr.code} ({curr.symbol})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Currency Code - TextInput */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Currency Code *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.currency}
              onChangeText={(text) => {
                const upperText = text.toUpperCase();
                let symbol = settings.currencySymbol;
                
                // Auto-set common symbols based on currency code
                if (upperText === 'SGD') symbol = '$';
                else if (upperText === 'MYR') symbol = 'RM';
                else if (upperText === 'INR') symbol = '₹';
                else if (upperText === 'USD') symbol = '$';
                else if (upperText === 'EUR') symbol = '€';
                else if (upperText === 'GBP') symbol = '£';
                else if (upperText === 'JPY') symbol = '¥';
                else if (upperText === 'CNY') symbol = '¥';
                else if (upperText === 'KRW') symbol = '₩';
                else if (upperText === 'THB') symbol = '฿';
                else if (upperText === 'VND') symbol = '₫';
                else if (upperText === 'IDR') symbol = 'Rp';
                
                setSettings({
                  ...settings,
                  currency: upperText,
                  currencySymbol: symbol
                });
              }}
              placeholder="SGD, MYR, INR, USD"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              maxLength={3}
              editable={!saving}
            />

            {/* Currency Symbol - TextInput */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Currency Symbol
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.currencySymbol}
              onChangeText={(text) => setSettings({...settings, currencySymbol: text})}
              placeholder="$"
              placeholderTextColor={theme.textSecondary}
              maxLength={3}
              editable={!saving}
            />

            {/* GST Toggle */}
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Enable GST</Text>
              <Switch
                value={enableGST}
                onValueChange={setEnableGST}
                trackColor={{ false: theme.inactive, true: theme.primary }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>

            {enableGST && (
              <>
                <Text style={[styles.label, { color: theme.textSecondary }]}>GST Number</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  value={settings.gstNo}
                  onChangeText={(text) => setSettings({...settings, gstNo: text})}
                  placeholder="Enter GST number"
                  placeholderTextColor={theme.textSecondary}
                  editable={!saving}
                />

                <Text style={[styles.label, { color: theme.textSecondary }]}>GST Percentage (%)</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  value={settings.gstPercentage.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setSettings({...settings, gstPercentage: num});
                  }}
                  placeholder="9"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                  editable={!saving}
                />
              </>
            )}

            {/* Phone */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.phone}
              onChangeText={(text) => setSettings({...settings, phone: text})}
              placeholder="Enter phone number"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              editable={!saving}
            />

            {/* Email */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.email}
              onChangeText={(text) => setSettings({...settings, email: text})}
              placeholder="Enter email"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              editable={!saving}
            />

            {/* Cashier Name */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Default Cashier Name</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={settings.cashierName}
              onChangeText={(text) => setSettings({...settings, cashierName: text})}
              placeholder="Cashier name"
              placeholderTextColor={theme.textSecondary}
              editable={!saving}
            />

          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : 
                <Text style={[styles.buttonText, { color: '#fff' }]}>Save Settings</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ✅ Add new styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    minHeight: Platform.OS === 'android' ? 70 : 60,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  readonlyField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // ✅ New styles for currency chips
  currencyScroll: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 50,
  },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default CompanySettingsForm;