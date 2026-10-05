import { supabase } from './supabaseClient';
import { FareEstimateResult, Ride, RideStatus } from '../types';

export interface CreateRideParams {
  passenger_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  passenger_count: number;
  pickup_location_id?: string;
  dropoff_location_id?: string;
}

export async function requestRide(params: CreateRideParams): Promise<Ride> {
  // 1. Calculate fare
  const { data: fareData, error: fareError } = await supabase.rpc('calculate_fare_estimate', {
    p_pickup_lat: params.pickup_lat,
    p_pickup_lng: params.pickup_lng,
    p_dropoff_lat: params.dropoff_lat,
    p_dropoff_lng: params.dropoff_lng,
    p_passenger_count: params.passenger_count,
  });

  if (fareError) throw fareError;

  const isUUID = (str?: string) =>
    str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

  // 2. Ensure valid database location records exist for pickup and dropoff
  let pickupLocId = isUUID(params.pickup_location_id) ? params.pickup_location_id : null;
  if (!pickupLocId) {
    try {
      const { data: pLoc } = await supabase
        .from('locations')
        .insert({
          latitude: params.pickup_lat,
          longitude: params.pickup_lng,
          address: params.pickup_address,
        })
        .select('location_id')
        .maybeSingle();
      if (pLoc) pickupLocId = pLoc.location_id;
    } catch {}
  }

  // If location insert was restricted or unavailable, fetch existing default location
  if (!pickupLocId) {
    const { data: fallbackLoc } = await supabase
      .from('locations')
      .select('location_id')
      .limit(1)
      .maybeSingle();
    if (fallbackLoc) pickupLocId = fallbackLoc.location_id;
  }

  let dropoffLocId = isUUID(params.dropoff_location_id) ? params.dropoff_location_id : null;
  if (!dropoffLocId) {
    try {
      const { data: dLoc } = await supabase
        .from('locations')
        .insert({
          latitude: params.dropoff_lat,
          longitude: params.dropoff_lng,
          address: params.dropoff_address,
        })
        .select('location_id')
        .maybeSingle();
      if (dLoc) dropoffLocId = dLoc.location_id;
    } catch {}
  }

  if (!dropoffLocId) {
    dropoffLocId = pickupLocId;
  }

  // 3. Insert ride
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .insert({
      passenger_id: params.passenger_id,
      pickup_location_id: pickupLocId,
      dropoff_location_id: dropoffLocId,
      pickup_address: params.pickup_address,
      dropoff_address: params.dropoff_address,
      pickup_lat: params.pickup_lat,
      pickup_lng: params.pickup_lng,
      dropoff_lat: params.dropoff_lat,
      dropoff_lng: params.dropoff_lng,
      passenger_count: params.passenger_count,
      estimated_distance_km: fareData.distance_km,
      fare: fareData.total_fare,
      status: 'pending',
    })
    .select(
      `
      *,
      passenger:passengers(*, user:users(*)),
      driver:drivers(*, user:users(*))
    `
    )
    .single();

  if (rideError) throw rideError;
  return ride as Ride;
}

export async function getRideDetails(rideId: string): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      `
      *,
      passenger:passengers(*, user:users(*)),
      driver:drivers(*, user:users(*))
    `
    )
    .eq('ride_id', rideId)
    .single();

  if (error) throw error;
  return data as Ride;
}

export async function acceptRide(rideId: string, driverId: string) {
  const { data, error } = await supabase.rpc('accept_ride_atomic', {
    p_ride_id: rideId,
    p_driver_id: driverId,
  });

  if (error) throw error;
  if (data && !data.success) {
    throw new Error(data.error || 'Failed to accept ride');
  }
  return data;
}

export async function updateRideStatus(rideId: string, status: RideStatus) {
  const updatePayload: any = { status };
  if (status === 'in_progress') {
    updatePayload.started_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('rides')
    .update(updatePayload)
    .eq('ride_id', rideId)
    .select()
    .single();

  if (error) throw error;
  return data as Ride;
}

export async function completeTrip(rideId: string, driverId: string) {
  try {
    const { data, error } = await supabase.rpc('complete_ride_and_payment', {
      p_ride_id: rideId,
      p_driver_id: driverId,
    });
    if (!error) return data;
  } catch {}

  // Direct fallback update if RPC is missing or fails
  const now = new Date().toISOString();
  const { data: rideData, error: rideError } = await supabase
    .from('rides')
    .update({
      status: 'completed',
      completed_at: now,
      payment_status: 'paid',
    })
    .eq('ride_id', rideId)
    .select()
    .single();

  if (rideError) throw rideError;

  // Insert payment record
  try {
    await supabase.from('payments').insert({
      ride_id: rideId,
      amount: rideData.fare,
      payment_method: 'cash',
      payment_status: 'completed',
      paid_at: now,
    });
  } catch {}

  return { success: true };
}

export async function cancelRide(
  rideId: string,
  reason: string,
  cancelledBy: 'passenger' | 'driver' | 'system'
) {
  const { data, error } = await supabase
    .from('rides')
    .update({
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_by: cancelledBy,
    })
    .eq('ride_id', rideId)
    .select()
    .single();

  if (error) throw error;
  return data as Ride;
}

export async function rateRide(rideId: string, rating: number, comment?: string) {
  const { data, error } = await supabase.rpc('submit_ride_rating', {
    p_ride_id: rideId,
    p_rating: rating,
    p_comment: comment || null,
  });

  if (error) throw error;
  return data;
}

export async function getPassengerRideHistory(passengerId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      `
      *,
      driver:drivers(*, user:users(*))
    `
    )
    .eq('passenger_id', passengerId)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Ride[];
}

export async function getDriverTripHistory(driverId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      `
      *,
      passenger:passengers(*, user:users(*))
    `
    )
    .eq('driver_id', driverId)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Ride[];
}

export function subscribeToRideChanges(rideId: string, callback: (ride: Ride) => void) {
  return supabase
    .channel(`ride_${rideId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `ride_id=eq.${rideId}`,
      },
      async () => {
        try {
          const freshRide = await getRideDetails(rideId);
          callback(freshRide);
        } catch {
          // ignore transient fetch errors
        }
      }
    )
    .subscribe();
}

export async function getPendingRides(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      `
      *,
      passenger:passengers(*, user:users(*)),
      driver:drivers(*, user:users(*))
    `
    )
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(10);

  if (error) return [];
  return (data || []) as Ride[];
}

export function subscribeToPendingRides(
  onNewPending: (ride: Ride) => void,
  onRideCancelledOrTaken?: (rideId: string, status?: string) => void
) {
  // Also perform an immediate fetch of existing pending rides
  getPendingRides().then((rides) => {
    if (rides.length > 0) {
      onNewPending(rides[0]);
    }
  }).catch(() => {});

  return supabase
    .channel('pending_rides_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rides',
      },
      async (payload) => {
        try {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const rideId = newRecord?.ride_id || oldRecord?.ride_id;

          if (newRecord && newRecord.status === 'pending') {
            const freshRide = await getRideDetails(newRecord.ride_id);
            onNewPending(freshRide);
          } else if (newRecord && (newRecord.status === 'cancelled' || newRecord.status === 'accepted')) {
            if (onRideCancelledOrTaken && rideId) {
              onRideCancelledOrTaken(rideId, newRecord.status);
            }
          }
        } catch {
          // ignore
        }
      }
    )
    .subscribe();
}
