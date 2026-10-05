-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 05: Seed Data (Makilala Reference Points & Default Settings)
-- ==============================================================================

-- 1. Default Fare Settings
insert into public.fare_settings (
  id,
  base_fare,
  base_distance_km,
  rate_per_km,
  rate_per_extra_passenger,
  match_radius_km,
  request_timeout_seconds
)
values (
  1,
  15.00,
  2.00,
  8.00,
  5.00,
  3.50,
  300
)
on conflict (id) do update
set
  base_fare = excluded.base_fare,
  base_distance_km = excluded.base_distance_km,
  rate_per_km = excluded.rate_per_km,
  rate_per_extra_passenger = excluded.rate_per_extra_passenger,
  match_radius_km = excluded.match_radius_km,
  request_timeout_seconds = excluded.request_timeout_seconds;

-- 2. Makilala Landmarks & Terminals
insert into public.locations (location_id, latitude, longitude, address, name, is_popular)
values
  ('11111111-1111-1111-1111-111111111101', 6.96045000, 125.08862000, 'Poblacion, Makilala, North Cotabato', 'Makilala Municipal Hall', true),
  ('11111111-1111-1111-1111-111111111102', 6.96210000, 125.08980000, 'Poblacion Public Market, Makilala', 'Makilala Public Market & Terminal', true),
  ('11111111-1111-1111-1111-111111111103', 6.96580000, 125.09320000, 'National Highway, Poblacion, Makilala', 'Makilala National High School', true),
  ('11111111-1111-1111-1111-111111111104', 6.95350000, 125.08150000, 'Brgy. Malasila, Makilala', 'Malasila Barangay Hall & Crossing', true),
  ('11111111-1111-1111-1111-111111111105', 6.97420000, 125.10540000, 'Brgy. Bulakanon, Makilala', 'Bulakanon Elementary School & Terminal', false),
  ('11111111-1111-1111-1111-111111111106', 6.94200000, 125.07100000, 'Brgy. Saguing, Makilala', 'Saguing Junction & Plaza', false),
  ('11111111-1111-1111-1111-111111111107', 6.98500000, 125.12000000, 'Brgy. Kisante, Makilala', 'Kisante Public Terminal', true),
  ('11111111-1111-1111-1111-111111111108', 6.96800000, 125.08400000, 'Brgy. Concepcion, Makilala', 'Concepcion Health Center', false)
on conflict (location_id) do nothing;
