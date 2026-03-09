import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export const useLicenseCheck = () => {
  const { logout } = useAuth();
  const appState = useRef(AppState.currentState);
  
  // Track which warnings have been shown
  const warningsShown = useRef({
    oneHour: false,
    tenMinutes: false,
    fiveMinutes: false,
    thirtySeconds: false
  });

  useEffect(() => {
    // Check license on app start
    checkLicense();

    // Check when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkLicense();
      }
      appState.current = nextAppState;
    });

    // Check every 30 seconds (more accurate for last minutes)
    const interval = setInterval(checkLicense, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const checkLicense = async () => {
    try {
      const response = await API.get('/license/status');
      const minutesLeft = response.data.MinutesRemaining;
      
      console.log('⏰ License minutes left:', minutesLeft);

      // If license expired
      if (minutesLeft <= 0) {
        // Reset warnings for next login
        warningsShown.current = {
          oneHour: false,
          tenMinutes: false,
          fiveMinutes: false,
          thirtySeconds: false
        };
        
        Alert.alert(
          'License Expired',
          'Your license has expired. Please contact your Admin.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
              }
            }
          ]
        );
        return;
      }

      // Show warnings at specific thresholds (only once each)
      
      // 1 hour warning (between 60 and 55 minutes)
      if (minutesLeft <= 60 && minutesLeft > 55 && !warningsShown.current.oneHour) {
        warningsShown.current.oneHour = true;
        Alert.alert(
          'License Expiring Soon',
          `Your license expires in 1 hour. Please save your work.`
        );
      }
      
      // 10 minutes warning
      if (minutesLeft <= 10 && minutesLeft > 9 && !warningsShown.current.tenMinutes) {
        warningsShown.current.tenMinutes = true;
        Alert.alert(
          'License Expiring Soon',
          `⚠️ Your license expires in 10 minutes! Please Contact your Admin!.`
        );
      }
      
      // 5 minutes warning
      if (minutesLeft <= 5 && minutesLeft > 4 && !warningsShown.current.fiveMinutes) {
        warningsShown.current.fiveMinutes = true;
        Alert.alert(
          'License Expiring Soon',
          `⚠️⚠️ Your license expires in 5 minutes! Please Contact your Admin!.`
        );
      }
      
      // 30 seconds warning
      if (minutesLeft <= 0.5 && minutesLeft > 0 && !warningsShown.current.thirtySeconds) {
        warningsShown.current.thirtySeconds = true;
        Alert.alert(
          'License Expiring Now',
          `⚠️⚠️⚠️ Your license expires in 30 seconds! Please Contact your Admin!.`,
          [
            {
              text: 'OK',
              onPress: () => console.log('User acknowledged 30s warning')
            }
          ]
        );
      }
      
    } catch (error) {
      
    }
  };
};