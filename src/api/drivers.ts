import { supabase } from './supabaseClient';
import { DriverProfile, DriverStatus, NearbyDriver } from '../types';

export async function updateDriverAvailability(driverId: string, status: DriverStatus) {
  const { data, error } = await supabase
    .from('drivers')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverProfile;
}

export async function updateDriverLocation(
  driverId: string,
  latitude: number,
  longitude: number
) {
  const { error } = await supabase
    .from('drivers')
    .update({
      current_lat: latitude,
      current_lng: longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId);

  if (error) throw error;
}

export async function getNearbyDrivers(
  pickupLat: number,
  pickupLng: number,
  passengerCount: number = 1,
  radiusKm: number = 3.5
): Promise<NearbyDriver[]> {
  const { data, error } = await supabase.rpc('get_nearby_drivers', {
    p_pickup_lat: pickupLat,
    p_pickup_lng: pickupLng,
    p_passenger_count: passengerCount,
    p_radius_km: radiusKm,
  });

  if (error) throw error;
  return (data || []) as NearbyDriver[];
}

export async function getDriverEarningsSummary(driverId: string) {
  const { data: rides, error } = await supabase
    .from('rides')
    .select('ride_id, fare, completed_at, passenger_count')
    .eq('driver_id', driverId)
    .eq('status', 'completed');

  if (error) throw error;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let todayTotal = 0;
  let weekTotal = 0;
  let allTimeTotal = 0;
  let todayTrips = 0;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  (rides || []).forEach((r) => {
    const amount = Number(r.fare) || 0;
    allTimeTotal += amount;

    if (r.completed_at) {
      const tripDate = new Date(r.completed_at);
      if (tripDate.toISOString().split('T')[0] === todayStr) {
        todayTotal += amount;
        todayTrips += 1;
      }
      if (tripDate >= oneWeekAgo) {
        weekTotal += amount;
      }
    }
  });

  return {
    todayTotal,
    todayTrips,
    weekTotal,
    allTimeTotal,
    totalTrips: (rides || []).length,
  };
}
