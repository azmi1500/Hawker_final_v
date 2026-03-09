// frontend/src/components/UPISettings.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api';

interface UPISettingsProps {
  visible: boolean;
  onClose: () => void;
  userId: number;
  theme: any;
  t: any;
  onUpdate: (upiId: string) => void;
}

const UPISettings: React.FC<UPISettingsProps> = ({
  visible,
  onClose,
  userId,
  theme,
  t,
  onUpdate
}) => {
  const [upiId, setUpiId] = useState('');
  const [enableUPI, setEnableUPI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUPISettings();
    }
  }, [visible]);

  const loadUPISettings = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/user/upi/${userId}`);
      const savedUpiId = response.data.upiId || '';
      setUpiId(savedUpiId);
      setEnableUPI(!!savedUpiId);
    } catch (error) {
      console.log('Error loading UPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUPISettings = async () => {
  if (enableUPI && !upiId.trim()) {
    Alert.alert('Error', 'Please enter UPI ID');
    return;
  }

  if (enableUPI && !upiId.includes('@')) {
    Alert.alert('Error', 'Invalid UPI ID format (should contain @)');
    return;
  }

  setSaving(true);
  try {
    // 1️⃣ Save UPI ID to database
    await API.put('/user/update-upi', {
      userId,
      upiId: enableUPI ? upiId.trim() : null
    });

    // 2️⃣ Get current payment modes
    const modesResponse = await API.get(`/user/payment-modes/${userId}`);
    let paymentModes = modesResponse.data.paymentModes || [];
    
    console.log('📋 Before update - paymentModes:', JSON.stringify(paymentModes, null, 2));

    // 3️⃣ Find UPI mode
    const upiIndex = paymentModes.findIndex((m: any) => m.id === 'upi');
    
    if (enableUPI) {
      // ✅ ENABLING UPI
      if (upiIndex === -1) {
        // Create NEW UPI mode with proper order
        const newUPIMode = {
          id: 'upi',
          name: 'UPI',
          icon: '📱',
          description: 'UPI QR payment',
          isActive: true,
          order: paymentModes.length // Add at the end
        };
        paymentModes.push(newUPIMode);
        console.log('✅ Created NEW UPI mode:', newUPIMode);
      } else {
        // Update existing UPI mode to active
        paymentModes[upiIndex] = {
          ...paymentModes[upiIndex],
          isActive: true,
          name: 'UPI', // Ensure name is correct
          icon: '📱'    // Ensure icon is correct
        };
        console.log('✅ Updated existing UPI mode to ACTIVE');
      }
    } else {
      // ❌ DISABLING UPI
      if (upiIndex !== -1) {
        paymentModes[upiIndex] = {
          ...paymentModes[upiIndex],
          isActive: false
        };
        console.log('✅ Updated UPI mode to INACTIVE');
      }
    }

    console.log('📋 After update - paymentModes:', JSON.stringify(paymentModes, null, 2));

    // 4️⃣ Save updated payment modes
    const saveResponse = await API.put('/user/payment-modes', {
      userId,
      paymentModes
    });

    console.log('✅ Save response:', saveResponse.data);

    Alert.alert('✅ Success', 'UPI settings saved');
    onUpdate(enableUPI ? upiId.trim() : '');
    onClose();

  } catch (error) {
    console.log('❌ Error saving UPI:', error);
    Alert.alert('Error', 'Failed to save UPI settings');
  } finally {
    setSaving(false);
  }
};

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              📱 UPI Payment Settings
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {loading ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <>
                {/* Enable UPI Switch */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLeft}>
                      <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
                      <Text style={[styles.switchLabel, { color: theme.text }]}>
                        Enable UPI Payments
                      </Text>
                    </View>
                    <Switch
                      value={enableUPI}
                      onValueChange={setEnableUPI}
                      trackColor={{ false: theme.inactive, true: theme.success }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {enableUPI && (
                  <>
                    {/* UPI ID Input */}
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>
                        Your UPI ID *
                      </Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: theme.card,
                          color: theme.text,
                          borderColor: theme.border
                        }]}
                        placeholder="e.g. shopname@okhdfcbank"
                        placeholderTextColor={theme.textSecondary}
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <Text style={[styles.helper, { color: theme.textSecondary }]}>
                        This UPI ID will be used for QR payments
                      </Text>

                      {/* Examples */}
                      <Text style={[styles.exampleTitle, { color: theme.textSecondary }]}>
                        Examples:
                      </Text>
                      <TouchableOpacity onPress={() => setUpiId('shop@okhdfcbank')}>
                        <Text style={[styles.example, { color: theme.primary }]}>
                          • shop@okhdfcbank
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setUpiId('shop@icici')}>
                        <Text style={[styles.example, { color: theme.primary }]}>
                          • shop@icici
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setUpiId('shop@ybl')}>
                        <Text style={[styles.example, { color: theme.primary }]}>
                          • shop@ybl (PhonePe)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Preview Card */}
                    <View style={[styles.previewCard, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.previewTitle, { color: theme.primary }]}>
                        QR Payment Preview
                      </Text>
                      <View style={styles.previewRow}>
                        <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                          UPI ID:
                        </Text>
                        <Text style={[styles.previewValue, { color: theme.text }]}>
                          {upiId || 'Not set'}
                        </Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                          Status:
                        </Text>
                        <Text style={[styles.previewValue, { color: upiId ? theme.success : theme.danger }]}>
                          {upiId ? '✅ Active' : '❌ Inactive'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Info Box */}
                <View style={[styles.infoBox, { backgroundColor: theme.info + '20' }]}>
                  <Ionicons name="information-circle" size={20} color={theme.info} />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    When enabled, UPI will appear as a payment option in checkout.
                    Customers can scan QR code or tap to open UPI app.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Buttons */}
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
              onPress={saveUPISettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  helper: {
    fontSize: 12,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  example: {
    fontSize: 13,
    paddingVertical: 2,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 16,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UPISettings;