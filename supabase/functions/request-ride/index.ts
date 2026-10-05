// Supabase Edge Function: request-ride
// Deno runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestRidePayload {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestRidePayload = await req.json();
    const {
      passenger_id,
      pickup_lat,
      pickup_lng,
      pickup_address,
      dropoff_lat,
      dropoff_lng,
      dropoff_address,
      passenger_count,
    } = body;

    if (!passenger_id || !pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return new Response(
        JSON.stringify({ error: "Missing required booking coordinates or passenger ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (passenger_count < 1 || passenger_count > 7) {
      return new Response(
        JSON.stringify({ error: "Passenger count must be between 1 and 7" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Calculate fare estimate via RPC
    const { data: fareData, error: fareError } = await supabase.rpc("calculate_fare_estimate", {
      p_pickup_lat: pickup_lat,
      p_pickup_lng: pickup_lng,
      p_dropoff_lat: dropoff_lat,
      p_dropoff_lng: dropoff_lng,
      p_passenger_count: passenger_count,
    });

    if (fareError) {
      return new Response(
        JSON.stringify({ error: "Fare calculation failed", details: fareError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch or create reference locations
    let pickupLocationId = body.pickup_location_id;
    if (!pickupLocationId) {
      const { data: locData, error: locErr } = await supabase
        .from("locations")
        .insert({
          latitude: pickup_lat,
          longitude: pickup_lng,
          address: pickup_address || "Pickup Point",
        })
        .select("location_id")
        .single();
      if (!locErr && locData) pickupLocationId = locData.location_id;
    }

    let dropoffLocationId = body.dropoff_location_id;
    if (!dropoffLocationId) {
      const { data: locData, error: locErr } = await supabase
        .from("locations")
        .insert({
          latitude: dropoff_lat,
          longitude: dropoff_lng,
          address: dropoff_address || "Destination Point",
        })
        .select("location_id")
        .single();
      if (!locErr && locData) dropoffLocationId = locData.location_id;
    }

    // 3. Find nearby eligible online drivers
    const { data: nearbyDrivers, error: driversError } = await supabase.rpc("get_nearby_drivers", {
      p_pickup_lat: pickup_lat,
      p_pickup_lng: pickup_lng,
      p_passenger_count: passenger_count,
      p_radius_km: 3.5,
    });

    // 4. Create the ride record with status 'pending'
    const { data: newRide, error: rideError } = await supabase
      .from("rides")
      .insert({
        passenger_id,
        pickup_location_id: pickupLocationId,
        dropoff_location_id: dropoffLocationId,
        pickup_address,
        dropoff_address,
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng,
        passenger_count,
        estimated_distance_km: fareData.distance_km,
        fare: fareData.total_fare,
        status: "pending",
      })
      .select()
      .single();

    if (rideError) {
      return new Response(
        JSON.stringify({ error: "Failed to create ride", details: rideError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ride: newRide,
        fare_estimate: fareData,
        eligible_drivers_count: nearbyDrivers ? nearbyDrivers.length : 0,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
