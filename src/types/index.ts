export * from './database.types';
export * from './navigation.types';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface NearbyDriver {
  driver_id: string;
  user_id: string;
  driver_name: string;
  phone: string;
  vehicle_number: string;
  license_number: string;
  seat_capacity: number;
  current_lat: number;
  current_lng: number;
  distance_km: number;
  rating_avg: number;
}
