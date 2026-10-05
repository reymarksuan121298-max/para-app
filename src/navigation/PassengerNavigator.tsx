import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PassengerStackParamList } from '../types';
import { HomeScreen } from '../screens/passenger/HomeScreen';
import { BookRideScreen } from '../screens/passenger/BookRideScreen';
import { TrackRideScreen } from '../screens/passenger/TrackRideScreen';
import { RideHistoryScreen } from '../screens/passenger/RideHistoryScreen';
import { PassengerProfileScreen } from '../screens/passenger/PassengerProfileScreen';

const Stack = createNativeStackNavigator<PassengerStackParamList>();

export const PassengerNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="PassengerHome" component={HomeScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
      <Stack.Screen name="PassengerProfile" component={PassengerProfileScreen} />
      <Stack.Screen name="BookRide" component={BookRideScreen} />
      <Stack.Screen name="TrackRide" component={TrackRideScreen} />
    </Stack.Navigator>
  );
};
