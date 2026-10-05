// Navigation param list types

import { LocationItem, Ride } from './database.types';

export type AuthStackParamList = {
  Login: undefined;
  Register: { defaultRole?: 'passenger' | 'driver' };
  RoleSelect: undefined;
};

export type PassengerTabParamList = {
  PassengerHome: undefined;
  RideHistory: undefined;
  PassengerProfile: undefined;
};

export type PassengerStackParamList = {
  PassengerTabs?: undefined;
  PassengerHome: undefined;
  RideHistory: undefined;
  PassengerProfile: undefined;
  BookRide: { pickup?: LocationItem; dropoff?: LocationItem };
  FareEstimate: {
    pickup: LocationItem;
    dropoff: LocationItem;
    passengerCount: number;
  };
  TrackRide: { rideId: string };
  RateRide: { rideId: string; driverName: string; driverId: string };
};

export type DriverTabParamList = {
  DriverDashboard: undefined;
  DriverEarnings: undefined;
  DriverProfile: undefined;
};

export type DriverStackParamList = {
  DriverTabs?: undefined;
  DriverDashboard: undefined;
  DriverEarnings: undefined;
  DriverProfile: undefined;
  IncomingRequest: { ride: Ride };
  ActiveTrip: { rideId: string };
};

export type AdminStackParamList = {
  AdminTabs?: undefined;
  AdminDashboard: undefined;
  ManageUsers: undefined;
  ManageFares: undefined;
  ManageLocations: undefined;
  Reports: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Passenger: undefined;
  Driver: undefined;
  Admin: undefined;
};
