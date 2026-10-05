import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../types';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { ActiveTripScreen } from '../screens/driver/ActiveTripScreen';
import { DriverEarningsScreen } from '../screens/driver/DriverEarningsScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';

const Stack = createNativeStackNavigator<DriverStackParamList>();

export const DriverNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
      <Stack.Screen name="DriverEarnings" component={DriverEarningsScreen} />
      <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
    </Stack.Navigator>
  );
};
