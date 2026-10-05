import { create } from 'zustand';
import { DriverStatus, Ride } from '../types';
import { updateDriverAvailability, updateDriverLocation } from '../api/drivers';

import { getCurrentCoordinates } from '../utils/location';

interface DriverState {
  status: DriverStatus;
  currentLat: number | null;
  currentLng: number | null;
  incomingRequest: Ride | null;
  activeTrip: Ride | null;
  declinedRideIds: string[];
  isLoading: boolean;
  error: string | null;

  setStatus: (status: DriverStatus) => void;
  setLocation: (lat: number, lng: number) => void;
  setIncomingRequest: (ride: Ride | null) => void;
  setActiveTrip: (trip: Ride | null) => void;
  toggleOnline: (driverId: string) => Promise<void>;
  broadcastLocation: (driverId: string, lat: number, lng: number) => Promise<void>;
  declineRequest: (rideId: string) => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  status: 'offline',
  currentLat: null,
  currentLng: null,
  incomingRequest: null,
  activeTrip: null,
  declinedRideIds: [],
  isLoading: false,
  error: null,

  setStatus: (status) => set({ status }),
  setLocation: (lat, lng) => set({ currentLat: lat, currentLng: lng }),
  setIncomingRequest: (ride) => set({ incomingRequest: ride }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),

  toggleOnline: async (driverId: string) => {
    try {
      set({ isLoading: true, error: null });
      const current = get().status;
      const nextStatus = current === 'online' ? 'offline' : 'online';
      await updateDriverAvailability(driverId, nextStatus);
      set({ status: nextStatus, isLoading: false });

      // Automatically acquire and broadcast current GPS coordinates on going online
      if (nextStatus === 'online') {
        getCurrentCoordinates()
          .then((coords) => {
            if (coords) {
              get().broadcastLocation(driverId, coords.latitude, coords.longitude);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  broadcastLocation: async (driverId: string, lat: number, lng: number) => {
    set({ currentLat: lat, currentLng: lng });
    try {
      await updateDriverLocation(driverId, lat, lng);
    } catch {
      // ignore transient location errors
    }
  },

  declineRequest: (rideId: string) => {
    const current = get().declinedRideIds;
    set({
      incomingRequest: null,
      declinedRideIds: [...current, rideId],
    });
  },
}));
