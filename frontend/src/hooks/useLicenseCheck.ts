import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export const useLicenseCheck = () => {
  const { logout } = useAuth();
  const appState = useRef(AppState.currentState);
  
  // Track if logout already in progress
  const loggingOut = useRef(false);
  
  // Track last check date (to run only once per day)
  const lastCheckDate = useRef<string>('');
  
  // Track if today's expiry check has been done
  const expiryCheckedToday = useRef(false);

  // Track which warnings have been shown
  const warningsShown = useRef({
    oneHour: false,
    tenMinutes: false,
    fiveMinutes: false,
    thirtySeconds: false
  });

  // ✅ Get Singapore date string (YYYY-MM-DD)
  const getSingaporeDate = () => {
    const now = new Date();
    // Singapore is UTC+8
    const singaporeTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return singaporeTime.toISOString().split('T')[0];
  };

  // ✅ Check if it's 6 AM Singapore time (with 5 minute window)
  const isSixAmSingapore = () => {
    const now = new Date();
    // Convert to Singapore time (UTC+8)
    const singaporeHour = (now.getUTCHours() + 8) % 24;
    const singaporeMinutes = now.getUTCMinutes();
    
    // Return true between 6:00 AM and 6:05 AM
    return singaporeHour === 6 && singaporeMinutes < 5;
  };

  useEffect(() => {
    // Check license on app start (ALWAYS check for admin blocks)
    checkLicense(true);

    // Check when app comes to foreground (ALWAYS check for admin blocks)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground, checking license...');
        checkLicense(true); // Force check for admin blocks
      }
      appState.current = nextAppState;
    });

    // Check every minute for 6AM Singapore time
    const interval = setInterval(() => {
      if (isSixAmSingapore() && !expiryCheckedToday.current) {
        console.log('🕕 6 AM Singapore time - checking daily license expiry');
        checkLicense(true);
        expiryCheckedToday.current = true;
      }
      
      // Reset expiry check at 6:10 AM
      if (isSixAmSingapore() && new Date().getUTCMinutes() > 10) {
        expiryCheckedToday.current = false;
      }
    }, 60000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const checkLicense = async (force: boolean = false) => {
    try {
      const today = getSingaporeDate();
      
      // 🚨 ALWAYS check for expired/admin block (no throttling)
      const response = await API.get('/license/status');
      const minutesLeft = response.data.MinutesRemaining;
      
      console.log('⏰ License minutes left:', minutesLeft);

      // 🚨 EXPIRED - Force logout immediately!
      if (minutesLeft <= 0) {
        console.log('🚨 LICENSE EXPIRED! Logging out...');
        
        if (!loggingOut.current) {
          loggingOut.current = true;
          
          // Reset warnings
          warningsShown.current = {
            oneHour: false,
            tenMinutes: false,
            fiveMinutes: false,
            thirtySeconds: false
          };
          
          // Show alert and logout
          Alert.alert(
            'License Expired',
            'Your license has expired. Please contact your Admin.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await logout();
                  loggingOut.current = false;
                }
              }
            ],
            { cancelable: false }
          );
        }
        return;
      }

      // Reset logging out flag if license valid
      loggingOut.current = false;
      
      // Update last check date only for non-forced checks
      if (!force) {
        lastCheckDate.current = today;
      }

      // Show warnings at specific thresholds (only once each)
      // These will still show based on actual minutes left
      
      // 1 hour warning
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
          `⚠️⚠️⚠️ Your license expires in 30 seconds! Please Contact your Admin!.`
        );
      }
      
    } catch (error) {
      console.log('❌ License check error:', error);
    }
  };
};