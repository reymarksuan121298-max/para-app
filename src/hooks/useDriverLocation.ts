import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useDriverStore } from '../store/driverStore';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
      granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    return false;
  }
}

import { getCurrentCoordinates } from '../utils/location';

export function useDriverLocation(driverId?: string | null, isOnline: boolean = false) {
  const { currentLat, currentLng, broadcastLocation } = useDriverStore();

  useEffect(() => {
    if (!driverId || !isOnline) return;

    let watchId: number | null = null;
    const activeDriverId = driverId;

    async function startTracking() {
      // 1. Immediately obtain fresh coordinates using unified GPS/network triangulation
      try {
        const initialCoords = await getCurrentCoordinates();
        if (initialCoords && activeDriverId) {
          broadcastLocation(activeDriverId, initialCoords.latitude, initialCoords.longitude);
        }
      } catch {}

      const hasPerm = await requestLocationPermission();
      if (!hasPerm) return;
      
      let lastLat: number | null = null;
      let lastLng: number | null = null;
      let lastBroadcastTime = 0;

      const onPos = (position: any) => {
        if (!activeDriverId || !position?.coords) return;
        const { latitude, longitude } = position.coords;
        const now = Date.now();

        // Throttle broadcasts: only update if moved significantly or every 5 seconds
        const hasMoved =
          lastLat === null ||
          lastLng === null ||
          Math.abs(latitude - lastLat) > 0.00005 || // ~5 meters
          Math.abs(longitude - lastLng) > 0.00005;

        const timeElapsed = now - lastBroadcastTime > 5000;

        if (hasMoved || timeElapsed) {
          lastLat = latitude;
          lastLng = longitude;
          lastBroadcastTime = now;
          broadcastLocation(activeDriverId, latitude, longitude);
        }
      };

      const onErr = () => {
        // Silently keep last broadcasted coordinates if location provider is toggled off or indoor/emulator
      };

      try {
        // Continuous live tracking with battery & UI friendly intervals
        watchId = Geolocation.watchPosition(onPos, onErr, {
          enableHighAccuracy: true,
          distanceFilter: 5,  // only trigger when driver moves at least 5 meters
          interval: 5000,     // 5 seconds standard interval
          fastestInterval: 4000,
        });
      } catch {}
    }

    startTracking();

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [driverId, isOnline, broadcastLocation]);

  return {
    latitude: currentLat,
    longitude: currentLng,
  };
}
