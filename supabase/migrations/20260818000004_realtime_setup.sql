-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 04: Supabase Realtime Setup
-- ==============================================================================

-- Enable Realtime publication for all public tables
begin;
  alter publication supabase_realtime add table public.users;
  alter publication supabase_realtime add table public.passengers;
  alter publication supabase_realtime add table public.drivers;
  alter publication supabase_realtime add table public.locations;
  alter publication supabase_realtime add table public.fare_settings;
  alter publication supabase_realtime add table public.rides;
  alter publication supabase_realtime add table public.payments;
  alter publication supabase_realtime add table public.ratings;
commit;

-- Enable REPLICA IDENTITY FULL so UPDATE/DELETE events contain complete record data
alter table public.users replica identity full;
alter table public.passengers replica identity full;
alter table public.drivers replica identity full;
alter table public.locations replica identity full;
alter table public.fare_settings replica identity full;
alter table public.rides replica identity full;
alter table public.payments replica identity full;
alter table public.ratings replica identity full;

