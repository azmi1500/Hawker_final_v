// components/DatePickerModal.tsx
import React, { useState, useRef, memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MemoizedDatePicker from './MemoizedDatePicker';

interface Props {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onApply: () => void;
  theme: any;
  t: any;
}

const DatePickerModal: React.FC<Props> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  theme,
  t
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'start' | 'end'>('start');
  const isPickingRef = useRef(false);

  const openStartPicker = useCallback(() => {
    console.log('📅 Opening start picker');
    isPickingRef.current = true;
    setPickerType('start');
    setShowPicker(true);
  }, []);

  const openEndPicker = useCallback(() => {
    console.log('📅 Opening end picker');
    isPickingRef.current = true;
    setPickerType('end');
    setShowPicker(true);
  }, []);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    console.log('📅 Date changed:', event.type, selectedDate);
    
    if (event.type === 'set' && selectedDate) {
      if (pickerType === 'start') {
        onStartDateChange(selectedDate);
      } else {
        onEndDateChange(selectedDate);
      }
      
      // ✅ FIX: Close picker with delay to avoid interference
      setTimeout(() => {
        setShowPicker(false);
        isPickingRef.current = false;
      }, 300);
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
      isPickingRef.current = false;
    }
  }, [pickerType, onStartDateChange, onEndDateChange]);

  const handleApply = useCallback(() => {
    console.log('📊 Applying filter');
    onApply();
  }, [onApply]);

  // Get date for picker
  const pickerValue = pickerType === 'start' ? startDate : endDate;

  return (
    <View style={[styles.customDateContainer, { backgroundColor: theme.surface }]}>
      {/* Start Date */}
      <View style={styles.datePickerRow}>
        <Text style={[styles.dateLabel, { color: theme.text }]}>{t.startDate}</Text>
        <TouchableOpacity 
          style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={openStartPicker}
        >
          <Text style={[styles.dateButtonText, { color: theme.text }]}>
            {startDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* End Date */}
      <View style={styles.datePickerRow}>
        <Text style={[styles.dateLabel, { color: theme.text }]}>{t.endDate}</Text>
        <TouchableOpacity 
          style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={openEndPicker}
        >
          <Text style={[styles.dateButtonText, { color: theme.text }]}>
            {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Apply Button */}
      <TouchableOpacity 
        style={[styles.applyButton, { backgroundColor: theme.secondary }]}
        onPress={handleApply}
      >
        <Text style={styles.applyButtonText}>{t.applyFilter}</Text>
      </TouchableOpacity>

      {/* Date Picker - Memoized */}
      <MemoizedDatePicker
        show={showPicker}
        value={pickerValue}
        onChange={handleDateChange}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  customDateContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  dateButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 2,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
  },
  applyButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ✅ Important: Memoize the whole component
export default memo(DatePickerModal);