// Supabase Edge Function: calculate-fare
// Deno runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_count } = body;

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return new Response(
        JSON.stringify({ error: "Missing coordinates for fare calculation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: fareData, error } = await supabase.rpc("calculate_fare_estimate", {
      p_pickup_lat: pickup_lat,
      p_pickup_lng: pickup_lng,
      p_dropoff_lat: dropoff_lat,
      p_dropoff_lng: dropoff_lng,
      p_passenger_count: passenger_count || 1,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...fareData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
