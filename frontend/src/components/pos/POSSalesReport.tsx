// components/pos/POSSalesReport.tsx (UPDATED)
import React, { useState, memo, useCallback } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DatePickerPortal from '../DatePickerPortal'; // ✅ Use portal
import TimerDisplay from '../TimerDisplay'; // ✅ Use isolated timer

interface Props {
  visible: boolean;
  onClose: () => void;
  salesHistory: any[];
  summary: any;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  theme: any;
  t: any;
}

const POSSalesReport: React.FC<Props> = ({
  visible,
  onClose,
  salesHistory,
  summary,
  selectedFilter,
  onFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  theme,
  t
}) => {
  // Local state for date pickers - isolated!
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Update local dates when props change (only when modal opens)
  React.useEffect(() => {
    if (visible) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
  }, [visible]);

  const handleStartConfirm = useCallback((date: Date) => {
    setLocalStartDate(date);
    onStartDateChange(date);
    setShowStartPicker(false);
  }, [onStartDateChange]);

  const handleEndConfirm = useCallback((date: Date) => {
    setLocalEndDate(date);
    onEndDateChange(date);
    setShowEndPicker(false);
  }, [onEndDateChange]);

  const handleApply = useCallback(() => {
    onFilterChange('custom');
  }, [onFilterChange]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          
          {/* Header with Timer */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{t.salesReport}</Text>
            <TimerDisplay theme={theme} t={t} /> {/* ✅ Timer inside header */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Buttons */}
          <ScrollView horizontal style={styles.filterScroll}>
            {['today', 'week', 'month', 'custom'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterBtn,
                  { backgroundColor: selectedFilter === filter ? theme.primary : theme.surface }
                ]}
                onPress={() => onFilterChange(filter)}
              >
                <Text style={[
                  styles.filterText,
                  { color: selectedFilter === filter ? '#fff' : theme.text }
                ]}>
                  {t[filter] || filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom Date Section */}
          {selectedFilter === 'custom' && (
            <View style={[styles.customDateContainer, { backgroundColor: theme.surface }]}>
              <TouchableOpacity 
                style={[styles.dateButton, { borderColor: theme.border }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>From:</Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {localStartDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.dateButton, { borderColor: theme.border }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>To:</Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {localEndDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rest of your sales report UI */}
          <ScrollView style={styles.content}>
            {/* ... your existing content ... */}
          </ScrollView>

        </View>
      </View>

      {/* Date Pickers - Completely Isolated */}
      <DatePickerPortal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={handleStartConfirm}
        currentDate={localStartDate}
        theme={theme}
        title="Select Start Date"
      />

      <DatePickerPortal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={handleEndConfirm}
        currentDate={localEndDate}
        theme={theme}
        title="Select End Date"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
  },
  filterScroll: {
    padding: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
  },
  customDateContainer: {
    padding: 16,
    margin: 12,
    borderRadius: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateLabel: {
    width: 40,
    fontSize: 14,
  },
  dateValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
});

export default memo(POSSalesReport);