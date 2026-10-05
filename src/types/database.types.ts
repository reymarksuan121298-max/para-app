// TypeScript definitions reflecting Supabase database tables & RPCs

export type UserRole = 'passenger' | 'driver' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending_approval';
export type DriverStatus = 'online' | 'offline' | 'on_trip';
export type RideStatus =
  | 'pending'
  | 'accepted'
  | 'en_route_to_pickup'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type PaymentStatus = 'paid' | 'unpaid';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PassengerProfile {
  passenger_id: string;
  user_id: string;
  preferred_payment_mode: string;
  total_rides: number;
  created_at: string;
  user?: UserProfile;
}

export interface DriverProfile {
  driver_id: string;
  user_id: string;
  license_number: string;
  vehicle_number: string;
  seat_capacity: number; // 5 to 7
  status: DriverStatus;
  current_lat?: number | null;
  current_lng?: number | null;
  rating_avg: number;
  total_trips: number;
  is_verified: boolean;
  updated_at: string;
  user?: UserProfile;
}

export interface LocationItem {
  location_id: string;
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
  is_popular?: boolean;
  created_at: string;
}

export interface FareSettings {
  id: number;
  base_fare: number;
  base_distance_km: number;
  rate_per_km: number;
  rate_per_extra_passenger: number;
  match_radius_km: number;
  request_timeout_seconds: number;
  updated_at: string;
}

export interface Ride {
  ride_id: string;
  passenger_id: string;
  driver_id?: string | null;
  pickup_location_id: string;
  dropoff_location_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  passenger_count: number;
  estimated_distance_km: number;
  status: RideStatus;
  fare: number;
  requested_at: string;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: 'passenger' | 'driver' | 'system' | null;
  passenger?: PassengerProfile;
  driver?: DriverProfile;
}

export interface Payment {
  payment_id: string;
  ride_id: string;
  amount: number;
  payment_method: 'cash';
  payment_status: PaymentStatus;
  payment_date?: string | null;
  collected_by_driver_id?: string | null;
  created_at: string;
}

export interface Rating {
  rating_id: string;
  ride_id: string;
  passenger_id: string;
  driver_id: string;
  rating: number; // 1-5
  comment?: string | null;
  created_at: string;
}

export interface FareEstimateResult {
  distance_km: number;
  base_fare: number;
  distance_fare: number;
  extra_passenger_fare: number;
  total_fare: number;
  passenger_count: number;
}
