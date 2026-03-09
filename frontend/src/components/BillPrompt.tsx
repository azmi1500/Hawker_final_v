// components/BillPrompt.tsx - COMPLETE WITH TRANSLATIONS ✅

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ✅ Define props interface with ALL properties
interface BillPromptProps {
  visible: boolean;
  onClose: () => void;
  onPrintBill: () => void;
  onSkip: () => void;
  theme: any;
  t: any;
  total: string;
  formatPrice: (amount: number) => string;  // ✅ Add this
}

const BillPrompt: React.FC<BillPromptProps> = (props) => {
  // ✅ Include formatPrice in destructuring
  const { visible, onClose, onPrintBill, onSkip, theme, t, total, formatPrice } = props;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="receipt-outline" size={50} color={theme.primary} />
          </View>
          
          {/* Title */}
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              {t.printBillReceipt}
            </Text>
          </View>
          
          {/* Amount - using formatPrice */}
          <Text style={[styles.amount, { color: theme.primary }]}>
            {t.totalAmount}: {formatPrice(parseFloat(total))}  {/* ✅ Now works! */}
          </Text>
          
          {/* Message */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {t.printBillMessage || 'Do you want to print a bill for this transaction?'}
          </Text>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton, { borderColor: theme.border }]}
              onPress={onSkip}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>
                {t.skipBill || 'No, Skip'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.printButton, { backgroundColor: theme.primary }]}
              onPress={onPrintBill}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {t.printBill || 'Yes, Print Bill'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Note */}
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            {t.billNote || 'You can also view bill in Sales Report'}
          </Text>
          
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
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1,
  },
  printButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default BillPrompt;