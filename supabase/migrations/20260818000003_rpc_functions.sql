-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 03: Atomic RPC Functions & Database Stored Procedures
-- ==============================================================================

-- 1. HAVERSINE DISTANCE HELPER (Kilometers)
create or replace function public.calculate_haversine_distance_km(
  lat1 decimal,
  lon1 decimal,
  lat2 decimal,
  lon2 decimal
)
returns decimal as $$
declare
  r constant decimal := 6371.0; -- Earth's radius in km
  dlat decimal;
  dlon decimal;
  a decimal;
  c decimal;
begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then
    return 0.0;
  end if;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2.0) * sin(dlat / 2.0) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2.0) * sin(dlon / 2.0);
  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
  return round(r * c, 2);
end;
$$ language plpgsql immutable;

-- 2. GET NEARBY AVAILABLE DRIVERS
create or replace function public.get_nearby_drivers(
  p_pickup_lat decimal,
  p_pickup_lng decimal,
  p_passenger_count int default 1,
  p_radius_km decimal default 3.0
)
returns table (
  driver_id uuid,
  user_id uuid,
  driver_name varchar(100),
  phone varchar(20),
  vehicle_number varchar(50),
  license_number varchar(50),
  seat_capacity int,
  current_lat decimal(10,8),
  current_lng decimal(11,8),
  distance_km decimal(6,2),
  rating_avg decimal(3,2)
) as $$
begin
  return query
  select
    d.driver_id,
    d.user_id,
    u.name as driver_name,
    u.phone,
    d.vehicle_number,
    d.license_number,
    d.seat_capacity,
    d.current_lat,
    d.current_lng,
    public.calculate_haversine_distance_km(p_pickup_lat, p_pickup_lng, d.current_lat, d.current_lng) as distance_km,
    d.rating_avg
  from public.drivers d
  join public.users u on u.user_id = d.user_id
  where d.status = 'online'
    and d.is_verified = true
    and u.status = 'active'
    and d.seat_capacity >= p_passenger_count
    and d.current_lat is not null
    and d.current_lng is not null
    and public.calculate_haversine_distance_km(p_pickup_lat, p_pickup_lng, d.current_lat, d.current_lng) <= coalesce(p_radius_km, 3.0)
  order by distance_km asc;
end;
$$ language plpgsql stable security definer;

-- 3. CALCULATE FARE ESTIMATE
create or replace function public.calculate_fare_estimate(
  p_pickup_lat decimal,
  p_pickup_lng decimal,
  p_dropoff_lat decimal,
  p_dropoff_lng decimal,
  p_passenger_count int default 1
)
returns jsonb as $$
declare
  v_fare_settings public.fare_settings%rowtype;
  v_distance_km decimal(6,2);
  v_extra_km decimal(6,2);
  v_passenger_count int;
  v_single_fare decimal(10,2);
  v_total_fare decimal(10,2);
begin
  select * into v_fare_settings from public.fare_settings where id = 1;
  if not found then
    v_fare_settings.base_fare := 15.00;
    v_fare_settings.base_distance_km := 2.00;
    v_fare_settings.rate_per_km := 8.00;
    v_fare_settings.rate_per_extra_passenger := 5.00;
  end if;

  v_passenger_count := greatest(1, coalesce(p_passenger_count, 1));
  v_distance_km := public.calculate_haversine_distance_km(p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng);
  v_extra_km := greatest(0.0, v_distance_km - v_fare_settings.base_distance_km);

  -- Single Passenger Trip Fare
  v_single_fare := v_fare_settings.base_fare + (v_extra_km * v_fare_settings.rate_per_km);
  
  -- Multiplied Total Fare by Passenger Count (e.g. Total = Single Fare * Passengers)
  v_total_fare := v_single_fare * v_passenger_count;

  return jsonb_build_object(
    'distance_km', v_distance_km,
    'base_fare', v_fare_settings.base_fare,
    'distance_fare', round(v_extra_km * v_fare_settings.rate_per_km, 2),
    'single_fare', round(v_single_fare, 2),
    'total_fare', round(v_total_fare, 2),
    'passenger_count', v_passenger_count
  );
end;
$$ language plpgsql stable security definer;

-- 4. ATOMIC RIDE ACCEPTANCE WITH ROW LOCKING
create or replace function public.accept_ride_atomic(
  p_ride_id uuid,
  p_driver_id uuid
)
returns jsonb as $$
declare
  v_ride public.rides%rowtype;
  v_driver public.drivers%rowtype;
begin
  -- Lock and fetch driver
  select * into v_driver from public.drivers where driver_id = p_driver_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Driver not found');
  end if;

  if v_driver.status = 'on_trip' then
    return jsonb_build_object('success', false, 'error', 'Driver is already on an active trip');
  end if;

  -- Lock and fetch ride with exclusive lock
  select * into v_ride from public.rides where ride_id = p_ride_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Ride request not found');
  end if;

  if v_ride.status != 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Ride is no longer available (current status: ' || v_ride.status || ')'
    );
  end if;

  if v_driver.seat_capacity < v_ride.passenger_count then
    return jsonb_build_object(
      'success', false,
      'error', 'Passenger count exceeds driver vehicle capacity'
    );
  end if;

  -- Update ride to accepted & link driver
  update public.rides
  set
    driver_id = p_driver_id,
    status = 'accepted',
    accepted_at = now()
  where ride_id = p_ride_id;

  -- Update driver status to on_trip
  update public.drivers
  set
    status = 'on_trip',
    updated_at = now()
  where driver_id = p_driver_id;

  return jsonb_build_object(
    'success', true,
    'ride_id', p_ride_id,
    'driver_id', p_driver_id,
    'status', 'accepted'
  );
end;
$$ language plpgsql security definer;

-- 5. EXPIRE UNANSWERED PENDING RIDES
create or replace function public.expire_pending_rides()
returns int as $$
declare
  v_timeout_seconds int;
  v_expired_count int;
begin
  select request_timeout_seconds into v_timeout_seconds from public.fare_settings where id = 1;
  v_timeout_seconds := coalesce(v_timeout_seconds, 300);

  update public.rides
  set
    status = 'expired',
    cancel_reason = 'Request timed out after 5 minutes with no driver response',
    cancelled_by = 'system'
  where status = 'pending'
    and requested_at < (now() - (v_timeout_seconds || ' seconds')::interval);

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$ language plpgsql security definer;

-- 6. COMPLETE TRIP & RECORD CASH PAYMENT
create or replace function public.complete_ride_and_payment(
  p_ride_id uuid,
  p_driver_id uuid
)
returns jsonb as $$
declare
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where ride_id = p_ride_id and driver_id = p_driver_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Active ride not found for this driver');
  end if;

  update public.rides
  set
    status = 'completed',
    completed_at = now()
  where ride_id = p_ride_id;

  update public.drivers
  set
    status = 'online',
    total_trips = total_trips + 1,
    updated_at = now()
  where driver_id = p_driver_id;

  update public.passengers
  set total_rides = total_rides + 1
  where passenger_id = v_ride.passenger_id;

  -- Create / update payment entry
  insert into public.payments (ride_id, amount, payment_method, payment_status, payment_date, collected_by_driver_id)
  values (p_ride_id, v_ride.fare, 'cash', 'paid', now(), p_driver_id)
  on conflict (ride_id) do update
  set
    payment_status = 'paid',
    payment_date = now(),
    collected_by_driver_id = p_driver_id;

  return jsonb_build_object('success', true, 'ride_id', p_ride_id, 'status', 'completed');
end;
$$ language plpgsql security definer;

-- 7. SUBMIT RATING & UPDATE DRIVER AVERAGE
create or replace function public.submit_ride_rating(
  p_ride_id uuid,
  p_rating int,
  p_comment text default null
)
returns jsonb as $$
declare
  v_ride public.rides%rowtype;
  v_passenger_id uuid;
  v_new_avg decimal(3,2);
begin
  v_passenger_id := public.get_current_passenger_id();
  
  select * into v_ride from public.rides where ride_id = p_ride_id and passenger_id = v_passenger_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Ride not found or not owned by caller');
  end if;

  if v_ride.driver_id is null then
    return jsonb_build_object('success', false, 'error', 'Ride has no assigned driver');
  end if;

  insert into public.ratings (ride_id, passenger_id, driver_id, rating, comment)
  values (p_ride_id, v_passenger_id, v_ride.driver_id, p_rating, p_comment)
  on conflict (ride_id) do update
  set rating = p_rating, comment = p_comment;

  -- Recompute average rating for the driver
  select coalesce(round(avg(rating)::numeric, 2), 5.00)
  into v_new_avg
  from public.ratings
  where driver_id = v_ride.driver_id;

  update public.drivers
  set rating_avg = v_new_avg
  where driver_id = v_ride.driver_id;

  return jsonb_build_object('success', true, 'rating_avg', v_new_avg);
end;
$$ language plpgsql security definer;
