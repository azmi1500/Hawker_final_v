// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import LoginScreen from './src/screens/LoginScreen';
import PosScreen from './src/screens/PosScreen';
import { View, ActivityIndicator, Text } from 'react-native';
import { setNavigationCallback } from './src/api';
import { CurrencyProvider } from './src/context/CurrencyContext';
const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  console.log('🔄 AppNavigator - User:', user ? user.username : 'No user');
  console.log('🔄 AppNavigator - Loading:', isLoading);

  if (isLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF4444" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="POS" component={PosScreen} />
      )}
    </Stack.Navigator>
  );
}


function CallbackSetter() {
  const { logout } = useAuth();

  useEffect(() => {
    setNavigationCallback(async () => {
      console.log('🚪 Force logout triggered');
      await logout();
    });
  }, [logout]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
           <CurrencyProvider>  
          <CallbackSetter />  
          <NavigationContainer>
            <AppNavigator />
            
          </NavigationContainer>
          </CurrencyProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}