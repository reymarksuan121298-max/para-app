import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationItem } from '../types';

export interface SavedPlace {
  id: string;
  type: 'home' | 'work' | 'school' | 'custom';
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  icon: string;
}

const SAVED_LOCATIONS_KEY = '@para_saved_places';

export const getSavedPlaces = async (): Promise<SavedPlace[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_LOCATIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const savePlace = async (place: Omit<SavedPlace, 'id'> & { id?: string }): Promise<SavedPlace[]> => {
  try {
    const current = await getSavedPlaces();
    const existingIndex = current.findIndex((p) => p.type === place.type && p.type !== 'custom');

    let updated: SavedPlace[];
    if (existingIndex >= 0 && place.type !== 'custom') {
      // Update existing home / work
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...place,
        id: updated[existingIndex].id,
      };
    } else {
      const newPlace: SavedPlace = {
        ...place,
        id: place.id || `place_${Date.now()}`,
      };
      updated = [newPlace, ...current];
    }

    await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return await getSavedPlaces();
  }
};

export const removeSavedPlace = async (id: string): Promise<SavedPlace[]> => {
  try {
    const current = await getSavedPlaces();
    const updated = current.filter((p) => p.id !== id);
    await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return await getSavedPlaces();
  }
};
