import { create } from 'zustand';
import { FareEstimateResult, LocationItem, Ride } from '../types';
import { getRideDetails, getPassengerRideHistory } from '../api/rides';

interface RideState {
  activeRide: Ride | null;
  selectedPickup: LocationItem | null;
  selectedDropoff: LocationItem | null;
  passengerCount: number;
  fareEstimate: FareEstimateResult | null;
  rideHistory: Ride[];
  isLoading: boolean;
  error: string | null;

  setActiveRide: (ride: Ride | null) => void;
  setSelectedPickup: (location: LocationItem | null) => void;
  setSelectedDropoff: (location: LocationItem | null) => void;
  setPassengerCount: (count: number) => void;
  setFareEstimate: (estimate: FareEstimateResult | null) => void;
  fetchActiveRide: (rideId: string) => Promise<void>;
  fetchRideHistory: (passengerId: string) => Promise<void>;
  clearBookingSelection: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  activeRide: null,
  selectedPickup: null,
  selectedDropoff: null,
  passengerCount: 1,
  fareEstimate: null,
  rideHistory: [],
  isLoading: false,
  error: null,

  setActiveRide: (ride) => set({ activeRide: ride }),
  setSelectedPickup: (location) => set({ selectedPickup: location }),
  setSelectedDropoff: (location) => set({ selectedDropoff: location }),
  setPassengerCount: (count) => set({ passengerCount: Math.min(7, Math.max(1, count)) }),
  setFareEstimate: (estimate) => set({ fareEstimate: estimate }),

  fetchActiveRide: async (rideId: string) => {
    try {
      set({ isLoading: true, error: null });
      const ride = await getRideDetails(rideId);
      set({ activeRide: ride, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  fetchRideHistory: async (passengerId: string) => {
    try {
      set({ isLoading: true, error: null });
      const history = await getPassengerRideHistory(passengerId);
      set({ rideHistory: history, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  clearBookingSelection: () =>
    set({
      selectedPickup: null,
      selectedDropoff: null,
      passengerCount: 1,
      fareEstimate: null,
    }),
}));
