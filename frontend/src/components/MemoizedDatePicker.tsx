// components/MemoizedDatePicker.tsx
import React, { memo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface Props {
  show: boolean;
  value: Date;
  onChange: (event: any, date?: Date) => void;
  onClose: () => void;
}

const MemoizedDatePicker: React.FC<Props> = ({ show, value, onChange, onClose }) => {
  if (!show) return null;

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={(event, date) => {
        onChange(event, date);
        // Don't close immediately on Android
        if (Platform.OS === 'android' && event.type === 'set') {
          // Keep open
        } else if (Platform.OS === 'ios') {
          // Close after selection on iOS
          setTimeout(onClose, 500);
        }
      }}
    />
  );
};

// ✅ Important: This prevents re-renders when parent updates
export default memo(MemoizedDatePicker);