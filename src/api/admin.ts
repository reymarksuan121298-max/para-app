import { supabase } from './supabaseClient';
import { FareSettings, LocationItem, Ride, UserProfile } from '../types';

export async function getAdminOverviewStats() {
  const [usersRes, driversRes, ridesRes, completedRidesRes] = await Promise.all([
    supabase.from('users').select('role', { count: 'exact' }),
    supabase.from('drivers').select('status', { count: 'exact' }),
    supabase.from('rides').select('status', { count: 'exact' }),
    supabase.from('rides').select('fare').eq('status', 'completed'),
  ]);

  const totalUsers = usersRes.count || 0;
  const totalDrivers = driversRes.count || 0;
  const totalRides = ridesRes.count || 0;

  const totalFareVolume = (completedRidesRes.data || []).reduce(
    (acc, cur) => acc + (Number(cur.fare) || 0),
    0
  );

  return {
    totalUsers,
    totalDrivers,
    totalRides,
    totalFareVolume,
  };
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as UserProfile[];
}

export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'pending_approval'
) {
  const { data, error } = await supabase
    .from('users')
    .update({ status })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFareSettings(): Promise<FareSettings> {
  const { data, error } = await supabase
    .from('fare_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return data as FareSettings;
  }

  // If table has no rows, fallback to default and seed row id 1
  const defaultSettings: FareSettings = {
    id: 1,
    base_fare: 15.0,
    base_distance_km: 2.0,
    rate_per_km: 8.0,
    rate_per_extra_passenger: 5.0,
    match_radius_km: 3.5,
    request_timeout_seconds: 300,
    updated_at: new Date().toISOString(),
  };

  // Attempt to auto-seed row id 1
  try {
    const { data: inserted } = await supabase
      .from('fare_settings')
      .upsert(defaultSettings)
      .select()
      .maybeSingle();
    if (inserted) return inserted as FareSettings;
  } catch {}

  return defaultSettings;
}

export async function updateFareSettings(settings: Partial<FareSettings>) {
  const { data, error } = await supabase
    .from('fare_settings')
    .upsert({
      id: 1,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as FareSettings;
}

export async function getAllLocations(): Promise<LocationItem[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('is_popular', { ascending: false });

  if (error) throw error;
  return (data || []) as LocationItem[];
}

export async function createLocation(location: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_popular?: boolean;
}) {
  const { data, error } = await supabase.from('locations').insert(location).select().single();

  if (error) throw error;
  return data as LocationItem;
}

export async function deleteLocation(locationId: string) {
  const { error } = await supabase.from('locations').delete().eq('location_id', locationId);

  if (error) throw error;
}

export interface LivePassengerLocation {
  id: string;
  type: 'pickup' | 'dropoff';
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  passenger_name?: string;
  status: string;
  requested_at: string;
}

export async function getLivePassengerLocations(): Promise<LivePassengerLocation[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      ride_id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      status,
      requested_at,
      passenger:passengers(user:users(name))
    `)
    .order('requested_at', { ascending: false })
    .limit(30);

  if (error || !data) return [];

  const points: LivePassengerLocation[] = [];
  data.forEach((r: any) => {
    const passengerName = r.passenger?.user?.name || 'Passenger';
    if (r.pickup_lat && r.pickup_lng) {
      points.push({
        id: `p-${r.ride_id}`,
        type: 'pickup',
        name: `📍 Pickup: ${r.pickup_address?.split(',')[0] || 'Pickup Point'}`,
        address: r.pickup_address || '',
        latitude: Number(r.pickup_lat),
        longitude: Number(r.pickup_lng),
        passenger_name: passengerName,
        status: r.status,
        requested_at: r.requested_at,
      });
    }
  });

  return points;
}

export async function getRideReports(filter?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Ride[]> {
  let query = supabase
    .from('rides')
    .select(
      `
      *,
      passenger:passengers(*, user:users(*)),
      driver:drivers(*, user:users(*))
    `
    )
    .order('requested_at', { ascending: false });

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  if (filter?.startDate) {
    query = query.gte('requested_at', filter.startDate);
  }

  if (filter?.endDate) {
    query = query.lte('requested_at', filter.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Ride[];
}
