import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../types';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { ManageUsersScreen } from '../screens/admin/ManageUsersScreen';
import { ManageFaresScreen } from '../screens/admin/ManageFaresScreen';
import { ManageLocationsScreen } from '../screens/admin/ManageLocationsScreen';
import { ReportsScreen } from '../screens/admin/ReportsScreen';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Stack.Screen name="ManageFares" component={ManageFaresScreen} />
      <Stack.Screen name="ManageLocations" component={ManageLocationsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
};
