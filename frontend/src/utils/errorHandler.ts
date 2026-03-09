// frontend/src/utils/errorHandler.ts

import { Alert } from 'react-native';

export const handleApiError = (
  error: any,
  customMessage?: string,
  showAlert: boolean = true
): string => {
  
  // Get user-friendly message
  const message = error.userMessage || customMessage || 'An error occurred';
  
  // Show alert if needed
  if (showAlert) {
    Alert.alert('Error', message);
  }
  
  // Return message for component use
  return message;
};

export const showSuccess = (message: string) => {
  Alert.alert('Success', message);
};

export const showInfo = (message: string) => {
  Alert.alert('Info', message);
};

export const showWarning = (message: string) => {
  Alert.alert('Warning', message);
};