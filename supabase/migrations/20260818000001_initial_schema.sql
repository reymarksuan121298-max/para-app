-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 01: Initial Schema
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. USERS (Public Profile extending auth.users)
create table if not exists public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name varchar(100) not null,
  email varchar(100) unique not null,
  phone varchar(20),
  role text not null check (role in ('passenger', 'driver', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending_approval')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PASSENGERS
create table if not exists public.passengers (
  passenger_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(user_id) on delete cascade,
  preferred_payment_mode text default 'cash',
  total_rides int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. DRIVERS
create table if not exists public.drivers (
  driver_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(user_id) on delete cascade,
  license_number varchar(50) not null,
  vehicle_number varchar(50) not null,
  seat_capacity int not null check (seat_capacity between 5 and 7),
  status text not null default 'offline' check (status in ('online', 'offline', 'on_trip')),
  current_lat decimal(10,8),
  current_lng decimal(11,8),
  rating_avg decimal(3,2) default 5.00,
  total_trips int not null default 0,
  is_verified boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 4. LOCATIONS (Makilala reference landmarks & terminals)
create table if not exists public.locations (
  location_id uuid primary key default gen_random_uuid(),
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  address varchar(255) not null,
  name varchar(100),
  is_popular boolean default false,
  created_at timestamptz not null default now()
);

-- 5. FARE SETTINGS (Admin configurable)
create table if not exists public.fare_settings (
  id int primary key default 1 check (id = 1),
  base_fare decimal(10,2) not null default 15.00,
  base_distance_km decimal(5,2) not null default 2.00,
  rate_per_km decimal(10,2) not null default 8.00,
  rate_per_extra_passenger decimal(10,2) not null default 5.00,
  match_radius_km decimal(5,2) not null default 3.00,
  request_timeout_seconds int not null default 300,
  updated_at timestamptz not null default now()
);

-- 6. RIDES
create table if not exists public.rides (
  ride_id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.passengers(passenger_id),
  driver_id uuid references public.drivers(driver_id),
  pickup_location_id uuid not null references public.locations(location_id),
  dropoff_location_id uuid not null references public.locations(location_id),
  pickup_address text,
  dropoff_address text,
  pickup_lat decimal(10,8) not null,
  pickup_lng decimal(11,8) not null,
  dropoff_lat decimal(10,8) not null,
  dropoff_lng decimal(11,8) not null,
  passenger_count int not null check (passenger_count between 1 and 7),
  estimated_distance_km decimal(6,2),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'en_route_to_pickup', 'in_progress', 'completed', 'cancelled', 'expired')),
  fare decimal(10,2) not null default 0.00,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancel_reason text,
  cancelled_by text check (cancelled_by in ('passenger', 'driver', 'system'))
);

-- 7. PAYMENTS
create table if not exists public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(ride_id) on delete cascade,
  amount decimal(10,2) not null,
  payment_method text not null default 'cash' check (payment_method in ('cash')),
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid')),
  payment_date timestamptz,
  collected_by_driver_id uuid references public.drivers(driver_id),
  created_at timestamptz not null default now()
);

-- 8. RATINGS / FEEDBACK
create table if not exists public.ratings (
  rating_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(ride_id) on delete cascade,
  passenger_id uuid not null references public.passengers(passenger_id),
  driver_id uuid not null references public.drivers(driver_id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_drivers_status on public.drivers(status);
create index if not exists idx_drivers_location on public.drivers(current_lat, current_lng);
create index if not exists idx_rides_passenger on public.rides(passenger_id);
create index if not exists idx_rides_driver on public.rides(driver_id);
create index if not exists idx_rides_status on public.rides(status);
create index if not exists idx_rides_requested_at on public.rides(requested_at);
