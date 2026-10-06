-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 08: Fix Rides, Locations, Payments RLS and Add Booking RPC
-- ==============================================================================

-- 1. RIDES POLICIES (Allow Booking, Viewing, and Updating under app session)
drop policy if exists "Passengers can view their own rides" on public.rides;
drop policy if exists "Passengers can create rides" on public.rides;
drop policy if exists "Passengers and assigned drivers can update rides" on public.rides;

create policy "Passengers can create rides"
  on public.rides for insert
  to anon, authenticated
  with check (true);

create policy "Passengers can view their own rides"
  on public.rides for select
  to anon, authenticated
  using (true);

create policy "Passengers and assigned drivers can update rides"
  on public.rides for update
  to anon, authenticated
  using (true);

-- 2. LOCATIONS POLICIES (Allow Map Pin and Address Queries)
drop policy if exists "All authenticated users can view locations" on public.locations;
drop policy if exists "Admins can insert/update/delete locations" on public.locations;

create policy "All users can view locations"
  on public.locations for select
  to anon, authenticated
  using (true);

create policy "Users and Admins can manage locations"
  on public.locations for all
  to anon, authenticated
  using (true);

-- 3. PAYMENTS & RATINGS POLICIES
drop policy if exists "View payments for involved parties or admin" on public.payments;
drop policy if exists "Drivers/Admins can insert and update payments" on public.payments;

create policy "All users can view payments"
  on public.payments for select
  to anon, authenticated
  using (true);

create policy "All users can insert and update payments"
  on public.payments for all
  to anon, authenticated
  using (true);

drop policy if exists "All authenticated users can read ratings" on public.ratings;
drop policy if exists "Passengers can create ratings for completed rides" on public.ratings;

create policy "All users can read ratings"
  on public.ratings for select
  to anon, authenticated
  using (true);

create policy "All users can submit ratings"
  on public.ratings for insert
  to anon, authenticated
  with check (true);

-- 4. ATOMIC BOOKING RPC FUNCTION (SECURITY DEFINER)
create or replace function public.create_ride_request(
  p_passenger_id uuid,
  p_pickup_lat decimal,
  p_pickup_lng decimal,
  p_pickup_address text,
  p_dropoff_lat decimal,
  p_dropoff_lng decimal,
  p_dropoff_address text,
  p_passenger_count int default 1,
  p_pickup_location_id uuid default null,
  p_dropoff_location_id uuid default null
)
returns jsonb as $$
declare
  v_fare_info jsonb;
  v_new_ride public.rides%rowtype;
begin
  -- Calculate fare estimate atomically
  v_fare_info := public.calculate_fare_estimate(
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng, p_passenger_count
  );

  insert into public.rides (
    passenger_id,
    pickup_location_id,
    dropoff_location_id,
    pickup_address,
    dropoff_address,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    passenger_count,
    estimated_distance_km,
    fare,
    status
  )
  values (
    p_passenger_id,
    p_pickup_location_id,
    p_dropoff_location_id,
    p_pickup_address,
    p_dropoff_address,
    p_pickup_lat,
    p_pickup_lng,
    p_dropoff_lat,
    p_dropoff_lng,
    p_passenger_count,
    coalesce((v_fare_info->>'distance_km')::decimal, 1.0),
    coalesce((v_fare_info->>'total_fare')::decimal, 15.0),
    'pending'
  )
  returning * into v_new_ride;

  return jsonb_build_object(
    'success', true,
    'ride_id', v_new_ride.ride_id,
    'fare', v_new_ride.fare,
    'status', v_new_ride.status
  );
end;
$$ language plpgsql security definer;

grant execute on function public.create_ride_request to anon, authenticated, service_role;
