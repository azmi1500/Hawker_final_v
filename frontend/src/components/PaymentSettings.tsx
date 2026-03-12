// components/PaymentSettings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api';

interface PaymentSettingsProps {
  visible: boolean;
  onClose: () => void;
  userId: number;
  theme: any;  // Theme will be passed from parent
  t: any;
  onUpdate: (newUpiId: string) => void;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({
  visible,
  onClose,
  userId,
  theme,
  t,
  onUpdate
}) => {
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load current UPI ID
  useEffect(() => {
    if (visible && userId) {
      loadUpiId();
    }
  }, [visible, userId]);

  const loadUpiId = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/user/upi/${userId}`);
      setUpiId(response.data.upiId || '');
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const saveUpiId = async () => {
    if (!upiId.trim()) {
      Alert.alert('Error', 'Please enter UPI ID');
      return;
    }

    if (!upiId.includes('@')) {
      Alert.alert('Error', 'Invalid UPI ID format (should contain @)');
      return;
    }

    setSaving(true);
    try {
      await API.put('/user/update-upi', {
        userId,
        upiId: upiId.trim()
      });
      
      Alert.alert('Success', 'UPI ID updated successfully');
      onUpdate(upiId.trim());
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update UPI ID');
     
    } finally {
      setSaving(false);
    }
  };

  const clearUpiId = () => {
    Alert.alert(
      'Confirm',
      'Remove UPI ID? UPI payments will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await API.put('/user/update-upi', {
                userId,
                upiId: null
              });
              setUpiId('');
              Alert.alert('Success', 'UPI ID removed');
              onUpdate('');
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove UPI ID');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* ✅ Use theme for modal content background */}
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Payment Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <ScrollView>
              {/* UPI Section */}
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
  <Text style={[styles.sectionTitle, { color: theme.text }]}>
    UPI Settings
  </Text>

                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Your UPI ID
                </Text>
                
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.surface,
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
                  This UPI ID will be used for QR payments. 
                  {!upiId ? ' Leave empty to disable UPI payments.' : ''}
                </Text>

                {/* Example UPI IDs */}
                <View style={styles.examples}>
                  <Text style={[styles.exampleTitle, { color: theme.textSecondary }]}>
                    Examples:
                  </Text>
                  <TouchableOpacity onPress={() => setUpiId('shop@okhdfcbank')}>
                    <Text style={[styles.example, { color: theme.primary }]}>• shop@okhdfcbank</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setUpiId('shop@icici')}>
                    <Text style={[styles.example, { color: theme.primary }]}>• shop@icici</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setUpiId('shop@ybl')}>
                    <Text style={[styles.example, { color: theme.primary }]}>• shop@ybl (PhonePe)</Text>
                  </TouchableOpacity>
                </View>

                {/* Remove button (only if UPI ID exists) */}
                {upiId ? (
                  <TouchableOpacity
                    style={[styles.removeButton, { borderColor: theme.danger }]}
                    onPress={clearUpiId}
                    disabled={saving}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    <Text style={[styles.removeButtonText, { color: theme.danger }]}>
                      Remove UPI ID
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Info Section */}
              <View style={[styles.infoBox, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="information-circle" size={20} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  After adding UPI ID, UPI payment option will appear in checkout.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={saveUpiId}
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ✅ Styles - Keep these independent of theme
const styles = StyleSheet.create({
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
  modalContent: {
    width: '100%',
    maxWidth: 100,
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
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
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
    marginBottom: 15,
  },
  examples: {
    marginBottom: 15,
  },
  exampleTitle: {
    fontSize: 12,
    marginBottom: 5,
  },
  example: {
    fontSize: 13,
    paddingVertical: 3,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
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
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentSettings;