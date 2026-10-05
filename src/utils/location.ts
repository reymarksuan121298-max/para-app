import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export async function requestLocationPermission(): Promise<boolean> {
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

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function getCurrentCoordinates(): Promise<Coordinates | null> {
  return new Promise(async (resolve) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      resolve(null);
      return;
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        // Fallback to low-accuracy network provider
        Geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          () => {
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; fullAddress: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'PARA-App-Mobile/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(',');
      const placeName = parts[0]?.trim() || 'Current Location';
      return {
        name: placeName,
        fullAddress: data.display_name,
      };
    }
  } catch {
    // Ignore network failure and return coordinate fallback
  }

  return {
    name: 'Current Location',
    fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}
