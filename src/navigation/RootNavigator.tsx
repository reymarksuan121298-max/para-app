import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { PassengerNavigator } from './PassengerNavigator';
import { DriverNavigator } from './DriverNavigator';
import { AdminNavigator } from './AdminNavigator';
import { colors } from '../theme';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : role === 'driver' ? (
          <Stack.Screen name="Driver" component={DriverNavigator} />
        ) : (
          <Stack.Screen name="Passenger" component={PassengerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
