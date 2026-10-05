export const PHILIPPINES_COORDINATES = {
  latitude: 12.8797,
  longitude: 121.7740,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

export const MAKILALA_COORDINATES = {
  latitude: 6.9604,
  longitude: 125.0886,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const DEFAULT_FARE_SETTINGS = {
  base_fare: 15.0,
  base_distance_km: 2.0,
  rate_per_km: 8.0,
  rate_per_extra_passenger: 5.0,
  match_radius_km: 3.5,
  request_timeout_seconds: 300,
};

export const TRICYCLE_SEAT_LIMITS = {
  min: 1,
  max: 7,
  driverMinCapacity: 5,
  driverMaxCapacity: 7,
};

export const RIDE_STATUS_LABELS: Record<string, string> = {
  pending: 'Finding Nearby Tricycles...',
  accepted: 'Driver Accepted & Heading to Pickup',
  en_route_to_pickup: 'Driver Arriving at Pickup',
  in_progress: 'Trip in Progress',
  completed: 'Trip Completed',
  cancelled: 'Booking Cancelled',
  expired: 'Request Expired',
};

export const RIDE_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  en_route_to_pickup: '#6366F1',
  in_progress: '#0D9488',
  completed: '#10B981',
  cancelled: '#EF4444',
  expired: '#64748B',
};
