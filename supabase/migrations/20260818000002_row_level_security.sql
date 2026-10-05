-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 02: Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all public tables
alter table public.users enable row level security;
alter table public.passengers enable row level security;
alter table public.drivers enable row level security;
alter table public.locations enable row level security;
alter table public.fare_settings enable row level security;
alter table public.rides enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;

-- Helper functions
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where user_id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

create or replace function public.get_current_driver_id()
returns uuid as $$
  select driver_id from public.drivers where user_id = auth.uid() limit 1;
$$ language sql security definer;

create or replace function public.get_current_passenger_id()
returns uuid as $$
  select passenger_id from public.passengers where user_id = auth.uid() limit 1;
$$ language sql security definer;

-- ------------------------------------------------------------------------------
-- 1. USERS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view user profiles (needed for driver/passenger name display)
create policy "Users can view profile data"
  on public.users for select
  to authenticated
  using (true);

-- Users can update their own profile; admins can update all
create policy "Users can update own profile or admin"
  on public.users for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Users can insert their initial profile row upon signup
create policy "Users can insert their own profile"
  on public.users for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. PASSENGERS POLICIES
-- ------------------------------------------------------------------------------
create policy "Passengers can view own record or drivers on active ride or admin"
  on public.passengers for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.rides r
    where r.passenger_id = public.passengers.passenger_id
      and r.driver_id = public.get_current_driver_id()
  ));

create policy "Passengers can insert own record"
  on public.passengers for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "Passengers can update own record"
  on public.passengers for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. DRIVERS POLICIES
-- ------------------------------------------------------------------------------
-- Passengers and drivers can view drivers (for map pins & ride tracking)
create policy "All authenticated users can view drivers"
  on public.drivers for select
  to authenticated
  using (true);

create policy "Drivers can update own record or admin"
  on public.drivers for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Drivers can insert own record"
  on public.drivers for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. LOCATIONS POLICIES
-- ------------------------------------------------------------------------------
create policy "All authenticated users can view locations"
  on public.locations for select
  to authenticated
  using (true);

create policy "Admins can insert/update/delete locations"
  on public.locations for all
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. FARE SETTINGS POLICIES
-- ------------------------------------------------------------------------------
create policy "All authenticated users can view fare settings"
  on public.fare_settings for select
  to authenticated
  using (true);

create policy "Admins can update fare settings"
  on public.fare_settings for update
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. RIDES POLICIES
-- ------------------------------------------------------------------------------
create policy "Passengers can view their own rides"
  on public.rides for select
  to authenticated
  using (
    passenger_id = public.get_current_passenger_id()
    or driver_id = public.get_current_driver_id()
    or (status = 'pending' and exists (select 1 from public.drivers where user_id = auth.uid() and status in ('online', 'on_trip')))
    or public.is_admin()
  );

create policy "Passengers can create rides"
  on public.rides for insert
  to authenticated
  with check (passenger_id = public.get_current_passenger_id() or public.is_admin());

create policy "Passengers and assigned drivers can update rides"
  on public.rides for update
  to authenticated
  using (
    passenger_id = public.get_current_passenger_id()
    or driver_id = public.get_current_driver_id()
    or (status = 'pending' and exists (select 1 from public.drivers where user_id = auth.uid()))
    or public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
create policy "View payments for involved parties or admin"
  on public.payments for select
  to authenticated
  using (
    public.is_admin()
    or collected_by_driver_id = public.get_current_driver_id()
    or exists (
      select 1 from public.rides r
      where r.ride_id = public.payments.ride_id
        and r.passenger_id = public.get_current_passenger_id()
    )
  );

create policy "Drivers/Admins can insert and update payments"
  on public.payments for all
  to authenticated
  using (
    public.is_admin()
    or collected_by_driver_id = public.get_current_driver_id()
    or exists (
      select 1 from public.rides r
      where r.ride_id = public.payments.ride_id
        and (r.driver_id = public.get_current_driver_id() or r.passenger_id = public.get_current_passenger_id())
    )
  );

-- ------------------------------------------------------------------------------
-- 8. RATINGS POLICIES
-- ------------------------------------------------------------------------------
create policy "All authenticated users can read ratings"
  on public.ratings for select
  to authenticated
  using (true);

create policy "Passengers can create ratings for completed rides"
  on public.ratings for insert
  to authenticated
  with check (
    passenger_id = public.get_current_passenger_id()
    or public.is_admin()
  );
